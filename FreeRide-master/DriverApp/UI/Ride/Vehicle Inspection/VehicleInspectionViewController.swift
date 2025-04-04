//
//  VehicleInspectionViewController.swift
//  FreeRide
//

import Foundation
import UIKit

extension Notification.Name {
    static let didCompleteCheckOutInspection = Notification.Name("didCompleteCheckOutInspection")
    static let didCompleteCheckInInspection = Notification.Name("didCompleteCheckInInspection")
}

class VehicleInspectionViewController: MultiFormViewController {
    
    var inspectionForm : InspectionForm?
    var vehicleId : String?
    var serviceKey : String?
        
    override func viewDidLoad() {
        
        leftNavigationStyle = .close
        leftNavigationAction = .dismiss(true)
        
        title = "Vehicle Inspection"
            
        view.backgroundColor = Theme.Colors.backgroundGray
        
        let headerView = UIView(backgroundColor: .clear)
        headerView.constrainHeight(20)
        topView.verticalStackView.addArrangedSubview(headerView)
        
        super.viewDidLoad()
        
        if context.currentVehicle != nil {
            confirmationButtonTitle = "Check In Vehicle"
            getInspection(checkingOut: false)
        } else {
            confirmationButtonTitle = "Check Out Vehicle"
            getInspection(checkingOut: true)
        }
    }
    
    func getInspection(checkingOut: Bool) {
        
        guard let vehicleId = self.vehicleId else {
            return
        }
        
        let query = InspectionQuery(id: vehicleId)
        
        let completionHandler: (ServiceResult<InspectionResponse>) -> Void = {
            result in
                switch result {
                case .success(let response):
                    self.inspectionForm = response.inspectionForm
                    self.buildForm(with: self.inspectionForm)
                case .failure(let error):
                    self.presentAlert(for: error)
                }
                ProgressHUD.dismiss()
        }
        
        ProgressHUD.show()
        if checkingOut {
            context.api.getCheckOutInspection(query: query, completion: completionHandler)
        } else {
            context.api.getCheckInInspection(completion: completionHandler)
        }
    }
    
    func buildForm(with inspection: InspectionForm?) {
        guard let questions = inspection?.questions else {
            return
        }
        
        for question in questions {
            switch question.responseType {
            case "number":
                let textField = getNumberField(from: question)
                fields.append(textField)
                textField.configureMember(of: fields, delegate: self)
                fieldsStackView.addArrangedSubview(textField)
                textField.translatesAutoresizingMaskIntoConstraints = false
                textField.pinHorizontalEdges(to: fieldsStackView, constant: 30)
                if question.questionKey == "battery" {
                    textField.maxLength = 3
                    textField.validators += [BatteryValidator()]
                }
            case "string":
                let textView = getTextView(from: question)
                textViews.append(textView)
                textView.additionalDelegate = self
                fieldsStackView.addArrangedSubview(textView)
                textView.translatesAutoresizingMaskIntoConstraints = false
                textView.pinHorizontalEdges(to: fieldsStackView, constant: 30)
            case "boolean":
                let checkbox = getCheckbox(from: question)
                checkBoxes.append(checkbox)
                fieldsStackView.addArrangedSubview(checkbox)
                checkbox.translatesAutoresizingMaskIntoConstraints = false
                checkbox.pinHorizontalEdges(to: fieldsStackView, constant: 30)
            default: break
            }
        }
    }
    
    func getNumberField(from question: InspectionQuestion) -> TextField {
        let field = TextField()
        field.configure(name: question.questionString, placeholder: question.questionString)
        field.id = question.id
        field.image = question.getImage()
        field.validators = question.optional ? [] : [RequiredValidator()]
        field.keyboardType = .numberPad
        field.autocorrectionType = .no
        field.autocapitalizationType = .none
        field.accessibilityIdentifier = question.questionKey
        return field
    }
    
    func getTextView(from question: InspectionQuestion) -> TextView {
        let textView = TextView()
        textView.id = question.id
        textView.image = question.getImage()
        textView.validators = question.optional ? [] : [RequiredValidator()]
        textView.configure(placeholder: question.questionString)
        textView.accessibilityIdentifier = question.questionKey
        return textView
    }
    
    func getCheckbox(from question: InspectionQuestion) -> CheckBox {
        let checkBox = CheckBox()
        checkBox.id = question.id
        checkBox.configure(title: question.questionString)
        checkBox.accessibilityIdentifier = question.questionKey
        return checkBox
    }
    
    override func handleConfirmationAction() {
        
        guard isValidWithError(), let inspection = inspectionForm else {
            return
        }
        
        var inspectionAnswers : [InspectionAnswer] = []
        
        for field in fields {
            if let fieldId = field.id, !field.inputText.isEmpty {
                inspectionAnswers.append(InspectionAnswer(questionId: fieldId, response: field.inputText))
            }
        }
        
        for view in textViews {
            if let viewId = view.id, !view.text.isEmpty {
                inspectionAnswers.append(InspectionAnswer(questionId: viewId, response: view.text))
            }
        }

        for checkbox in checkBoxes {
            if let checkboxId = checkbox.id {
                inspectionAnswers.append(InspectionAnswer(questionId: checkboxId , response: checkbox.isSelected ? "true" : "false"))
            }
        }
        
        let form = InspectionSubmission(id: inspection.id, responses: inspectionAnswers)
        
        let completionHandler: (ServiceResult<DriverStatusResponse>) -> Void = { result in
            switch result {
            case .success(let response):
                //change availability setting
                let currentUser = self.context.currentUser
                currentUser.update(with: response)
                //update vehicle
                let ds = self.context.dataStore
                ds.wipeVehicles()
                if let v = response.vehicle {
                    let vehicle = Vehicle(context: self.context.dataStore.mainContext)
                    vehicle.update(with: v)
                }
                Notification.post(.didUpdateDriverStatus)
                self.trackMixpanelEvent()
                self.dismiss(animated: true)
            case .failure(let error):
                self.presentAlert(for: error)
            }
            ProgressHUD.dismiss()
        }
        
        
        if inspection.isCheckOut() {
            guard let serviceKey = serviceKey, let vehicleId = self.vehicleId else {
                return
            }
            let answers = PostCheckOutInspectionRequest(service: serviceKey, inspectionForm: form)
            let query = InspectionQuery(id: vehicleId)
            ProgressHUD.show()
            context.api.postCheckOutInspection(query: query, request: answers, completion: completionHandler)
        } else {
            let answers = PostCheckInInspectionRequest(inspectionForm: form)
            ProgressHUD.show()
            context.api.postCheckInInspection(request: answers, completion: completionHandler)
        }
    }
    
    func trackMixpanelEvent() {
        guard let inspection = inspectionForm, let vehicleId = self.vehicleId else {
            return
        }
        MixpanelManager.trackEvent(
            inspection.isCheckOut() ? MixpanelEvents.DRIVER_VEHICLE_CHECK_OUT : MixpanelEvents.DRIVER_VEHICLE_CHECK_IN,
            properties: [
                "vehicle_id": vehicleId,
            ]
        )
    }
    
}

