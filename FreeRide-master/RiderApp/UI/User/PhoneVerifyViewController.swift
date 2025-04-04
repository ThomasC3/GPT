//
//  PhoneVerifyViewController.swift
//  RiderApp
//
//  Created by Andrew Boryk on 1/1/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import Foundation

class PhoneVerifyViewController: FormViewController, LogoutHandler {

    var completingPhoneVerification = false
    
    private let pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        view.style = .changePhoneVerify
        return view
    }()
    
    private lazy var countryCodeField: TextField = {
        let field = TextField()
        field.configure(name: "user_country_code".localize(), placeholder: "user_country_code".localize())
        field.accessibilityIdentifier = "countryCodeTextField"
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "PhoneBadge")

        let picker = UIPickerView()
        picker.dataSource = self
        picker.delegate = self
        field.inputView = picker

        return field
    }()

    private let phoneField: TextField = {
        let field = TextField()
        field.configure(name: "user_mobile_phone".localize(), placeholder: "user_mobile_phone".localize())
        field.accessibilityIdentifier = "phoneNumberTextField"
        field.validators = [RequiredValidator(), PhoneValidator()]
        field.image = #imageLiteral(resourceName: "PhoneBadge")
        field.keyboardType = .phonePad
        return field
    }()

    override func viewDidLoad() {
        fields = [countryCodeField, phoneField]

        confirmationButtonTitle = "user_verify_phone".localize()
        
        leftNavigationStyle = .back

        if self.completingPhoneVerification {
            presentAlert("user_almost_there".localize(), message: "user_almost_there_info".localize())
            leftNavigationAction = .custom({
                self.logout()
            })
        } else {
            leftNavigationAction = .pop(true)
        }
        
        super.viewDidLoad()
    }

    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(pageView)
        pageView.pinHorizontalEdges(to: formStackView)
    }

    override func handleConfirmationAction() {
        guard isValidWithError() else {
            return
        }
        
        
        ProgressHUD.show()
        
        let request = PhonePincodeRequest(phone: phoneField.trimmedText, countryCode: getCountryCode(self.countryCodeField.trimmedText))
    
        context.api.phonePincode(request) { result in
            ProgressHUD.dismiss()
            
            switch result {
            case .success(_):
                let vc = PincodeViewController()
                vc.type = .phoneVerification
                vc.pincodeTarget = self.phoneField.trimmedText
                vc.countryCode = getCountryCode(self.countryCodeField.trimmedText)
                vc.completingPhoneVerification = self.completingPhoneVerification
                self.navigationController?.pushViewController(vc, animated: true)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

}

extension PhoneVerifyViewController: UIPickerViewDelegate, UIPickerViewDataSource {


    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }

    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return countryCodes.count
    }

    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        let country = countryCodes[row];
        return String(country.count == 0 ? "" : country.prefix(country.count - 2))
    }

    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        guard row < countryCodes.count else {
            return
        }
        
        let country = countryCodes[row];
        countryCodeField.text = String(country.count == 0 ? "" : country.prefix(country.count - 2))
        countryCodeField.toggleErrorState(invalidValidator: nil)
        
    }
}

