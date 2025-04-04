//
//  FixedStopActionView.swift
//  FreeRide
//

import UIKit

protocol ActionGroupTableViewCellDelegate: AnyObject {
    func didSelectActionUpdate(for rideID: String)
    func didSelectActionContact(for rideID: String)
    func didSelectActionCancel(for rideID: String)
}

class FixedStopActionView: UIView {

    @IBOutlet private weak var dividerView: UIView!
    @IBOutlet private weak var dropoffStack: UIStackView!
    @IBOutlet private weak var pickupStack: UIStackView!
    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var pickupLabel: Label!
    @IBOutlet private weak var dropoffLabel: Label!
    @IBOutlet private weak var contactButton: Button!
    @IBOutlet private weak var cancelButton: Button!
    @IBOutlet private weak var rideUpdateButton: Button!
    
       
    weak var delegate: ActionGroupTableViewCellDelegate?

    private var rideID: String?
    
    override func awakeFromNib() {
        super.awakeFromNib()
        nameLabel.style = .subtitle2darkgray
        nameLabel.font = Theme.Fonts.body6
        [pickupLabel, dropoffLabel].forEach { $0.style = .subtitle2darkgray }
        
        cancelButton.style = .cancel
        contactButton.style = .contact
        rideUpdateButton.style = .primary
    }

    
    func configure(with action: Action, isCurrent: Bool, hideArrived: Bool) {
        
        let driverArrived = action.status == .driverArrived
        
        rideID = action.rideId
        nameLabel.text = action.riderName
        pickupLabel.text = action.originAddressShort
        dropoffLabel.text = action.destinationAddressShort
        
        if action.isHailed {
            dropoffStack.isHidden = true
            pickupStack.isHidden = true
            nameLabel.isHidden = true
            contactButton.isHidden = true
            cancelButton.isHidden = true
            rideUpdateButton.isHidden = false
            rideUpdateButton.isEnabled = true
            dividerView.isHidden = true
            rideUpdateButton.setTitle("Drop Off", for: .normal)
        } else {
            dividerView.isHidden = false
            dropoffStack.isHidden = false
            pickupStack.isHidden = false
            nameLabel.isHidden = false
            rideUpdateButton.isEnabled = isCurrent
            if action.isDropoff {
                cancelButton.isHidden = true
                contactButton.isHidden = true
                rideUpdateButton.isHidden = false
                rideUpdateButton.setTitle("Drop Off", for: .normal)
            } else {
                cancelButton.isHidden = false
                contactButton.isHidden = false
                rideUpdateButton.isHidden = hideArrived
                rideUpdateButton.setTitle(driverArrived ? "Pick Up" : "Arrived", for: .normal)
            }
        }
    }
    
    @IBAction private func updateAction() {
        guard let rideID = rideID else {
            return
        }
        delegate?.didSelectActionUpdate(for: rideID)
    }
    
    @IBAction private func cancelAction() {
        guard let rideID = rideID else {
            return
        }
        delegate?.didSelectActionCancel(for: rideID)
    }
    
    @IBAction private func contactAction() {
        guard let rideID = rideID else {
            return
        }
        delegate?.didSelectActionContact(for: rideID)
    }

}
