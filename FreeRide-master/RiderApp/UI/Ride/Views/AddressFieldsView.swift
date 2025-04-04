//
//  AddressFieldsView.swift
//  RiderApp
//
//  Created by Andrew Boryk on 12/30/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol AddressFieldsViewDelegate: AnyObject {
    func didBeginEditting()
    func didEndEditting()
    func didChangeText(to text: String, isPickup: Bool, withDelay delay: TimeInterval)
    func didClearPickup()
    func didClearDropoff()
    func didEditPickupPin(editing: Bool)
    func didEditDropoffPin(editing: Bool)
}

class AddressFieldsView: CardView {

    @IBOutlet weak var statusLabelView: UIView!
    @IBOutlet weak var pickupAddressField: AddressTextField!
    @IBOutlet weak var dropoffAddressField: AddressTextField!
    @IBOutlet weak var editPickupButton: Button!
    @IBOutlet weak var editDropoffButton: Button!
    @IBOutlet weak var pickupAddressStack: UIStackView!
    @IBOutlet weak var dropoffAddressStack: UIStackView!
    @IBOutlet weak var statusLabel: Label!
    @IBOutlet weak var addressFieldsStack: UIStackView!
    
    private lazy var fields: [TextField] = [pickupAddressField, dropoffAddressField]

    weak var delegate: AddressFieldsViewDelegate?
    
    var isEnabled = true
    
    var fluxInfo: FluxResponse?

    override func awakeFromNib() {
        super.awakeFromNib()

        pickupAddressField.additionalDelegate = self
        pickupAddressField.accessibilityIdentifier = "pickupAddressField"
        dropoffAddressField.additionalDelegate = self
        dropoffAddressField.accessibilityIdentifier = "dropoffAddressField"
        pickupAddressField.clearButtonMode = .whileEditing
        dropoffAddressField.clearButtonMode = .whileEditing
        pickupAddressField.placeholder = "ride_pickup_address".localize()
        dropoffAddressField.placeholder = "ride_request_where_to".localize()
        editPickupButton.isHidden = true
        editDropoffButton.isHidden = true
        editPickupButton.style = .tertiaryDark
        editDropoffButton.style = .tertiaryDark
        editPickupButton.setTitleColor(Theme.Colors.seaFoam, for: .normal)
        editDropoffButton.setTitleColor(Theme.Colors.seaFoam, for: .normal)
        
        backgroundColor = Theme.Colors.kelp
        addressFieldsStack.backgroundColor = .white
        addressFieldsStack.cornerRadius = 16
        
        hideFlux()
    }
    
    func getCurrentFluxStatus() -> FluxResponse? {
        return fluxInfo
    }
    
    func hideFlux() {
        statusLabelView.isHidden = true
    }
    
    func configureFlux(fluxResponse: FluxResponse?) {
   
        guard let flux = fluxResponse else {
            return
        }
        
        fluxInfo = flux
        
        if flux.display {
            statusLabelView.isHidden = false
            statusLabel.textColor = flux.getTextColor()
            updateStatusLabel(normalText: "\("service_is".localize()) ", boldText: flux.message)
            backgroundColor = flux.getBackgroundColor()
        } else {
            statusLabelView.isHidden = true
        }
    }
    
    func updateStatusLabel(normalText: String, boldText: String) {
        let regularAttrs = [NSAttributedString.Key.font : Theme.Fonts.body7]
        let attributedString = NSMutableAttributedString(string:normalText, attributes: regularAttrs as [NSAttributedString.Key : Any])
        let boldAttrs = [NSAttributedString.Key.font : Theme.Fonts.body8]
        let boldString = NSMutableAttributedString(string: boldText, attributes: boldAttrs as [NSAttributedString.Key : Any])
        attributedString.append(boldString)
        statusLabel.attributedText = attributedString
    }
    

    func updatePickup(_ text: String) {
        pickupAddressField.isUserInteractionEnabled = true
        pickupAddressField.text = text
        if text == "" {
            pickupAddressField.textColor = Theme.Colors.coolGray
            editPickupButton.isHidden = true
        } else {
            pickupAddressField.textColor = Theme.Colors.blueGray
            editPickupButton.setTitle("ride_move_pin".localize(), for: .normal)
            editPickupButton.isHidden = !isEnabled
        }
    }
    
    func updateDropoff(_ text: String) {
        dropoffAddressField.isUserInteractionEnabled = true
        dropoffAddressField.text = text
        if text == "" {
            dropoffAddressField.textColor = Theme.Colors.coolGray
            editDropoffButton.isHidden = true
        } else {
            dropoffAddressField.textColor = Theme.Colors.blueGray
            editDropoffButton.setTitle("ride_move_pin".localize(), for: .normal)
            editDropoffButton.isHidden = !isEnabled
        }
    }
    
    func updatePickup(_ response: Address) {
        updatePickup(response.address)
    }

    func updateDropoff(_ response: Address) {
        updateDropoff(response.address)
    }
    
    func updateForFSColor(isConfimed: Bool, isPickup: Bool) {
        if isPickup {
            pickupAddressField.textColor = isConfimed ? Theme.Colors.blueGray : Theme.Colors.sunshine
        } else {
            dropoffAddressField.textColor = isConfimed ? Theme.Colors.blueGray : Theme.Colors.sunshine
        }
    }
    
    func updatePickupAndDropoff(for ride: Ride?) {
        guard let origin = ride?.originAddress else {
            return
        }
        guard let destination = ride?.destinationAddress else {
            return
        }
        updatePickup(origin)
        updateDropoff(destination)
    }

    func updateFields(for status: Ride.Status?) {
        guard let status = status else {
            return
        }

        let isPickupHidden = false
        let isDropoffHidden = false
        
        editDropoffButton.isHidden = true
        editPickupButton.isHidden = true
        
        switch status {
        case .rideRequested:
            isEnabled = false
            
            
        //TODO: set the proper appearance of this element depending on the ride status
        case .rideInProgress:
            //isPickupHidden = true
            isEnabled = false
        case .driverArrived, .driverEnRoute, .nextInQueue, .rideAccepted:
            //isDropoffHidden = true
            isEnabled = false
        case .rideComplete, .cancelledRequest, .cancelledEnRoute, .cancelledInQueue, .cancelledNoShow, .cancelledNotAble:
            isEnabled = true
            updateDropoff("")
            updatePickup("")
        default:
            break
        }

        fields.forEach {
            $0.clearButtonMode = isEnabled ? .always : .never
            $0.isUserInteractionEnabled = isEnabled
        }

        pickupAddressStack.isHidden = isPickupHidden

        dropoffAddressStack.isHidden = isDropoffHidden

        layoutSubviews()
        layoutIfNeeded()
    }
    
    @IBAction func editPickupAction(_ sender: Any) {
        let editing = editPickupButton.title(for: .normal) == "general_done".localize()
        delegate?.didEditPickupPin(editing: editing)
        editPickupButton.setTitle(editing ? "ride_move_pin".localize() : "general_done".localize(), for: .normal)
        pickupAddressField.isUserInteractionEnabled = editing
    }
    
    @IBAction func editDropoffAction(_ sender: Any) {
        let editing = editDropoffButton.title(for: .normal) == "general_done".localize()
        delegate?.didEditDropoffPin(editing: editing)
        editDropoffButton.setTitle(editing ? "ride_move_pin".localize() : "general_done".localize(), for: .normal)
        dropoffAddressField.isUserInteractionEnabled = editing
    }
    
}

extension AddressFieldsView: TextFieldDelegate {

    func didBeginEditing(textField: TextField) {
        delegate?.didBeginEditting()
        if textField == pickupAddressField {
            editPickupButton.isHidden = true
            pickupAddressField.text = ""
            delegate?.didChangeText(to: pickupAddressField.text ?? "", isPickup: true, withDelay: 0)
        } else {
            editDropoffButton.isHidden = true
            dropoffAddressField.text = ""
            delegate?.didChangeText(to: dropoffAddressField.text ?? "", isPickup: false, withDelay: 0)
        }
    }

    func didEndEditing(textField: TextField) {
        delegate?.didEndEditting()
    }

    func didClear(textField: TextField) {
        if textField == pickupAddressField {
            self.updatePickup("")
            delegate?.didClearPickup()
        } else {
            self.updateDropoff("")
            delegate?.didClearDropoff()
        }
    }

    func didReturn(textField: TextField) {}

    func didChangeText(in textField: TextField) {
        guard let text = textField.text?.trimmingCharacters(in: .whitespacesAndNewlines),
            !text.isEmpty else {
                return
        }

        delegate?.didChangeText(to: text, isPickup: textField == pickupAddressField, withDelay: 0.35)
    }
}

extension AddressFieldsView: FieldAccessoryViewDelegate {

    func shouldTransition(forward: Bool, fromIndex index: Int) {
        if forward && index == 0 {
            dropoffAddressField.becomeFirstResponder()
        } else if !forward && index == 1 {
            pickupAddressField.becomeFirstResponder()
        }
    }
}
