//
//  CurrentRidesTableViewCell.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/12/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol CurrentRidesTableViewCellDelegate: AnyObject {
    func didSelectActionUpdate(for rideID: String, isPickupStop: Bool, driverArrived: Bool, isFixedStop: Bool)
    func didSelectActionContact(for rideID: String)
    func didSelectActionCancel(for rideID: String, driverArrived: Bool)
}

class CurrentRidesTableViewCell: UITableViewCell {

    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var etaLabel: Label!
    @IBOutlet private weak var pickupStackView: UIStackView!
    @IBOutlet private weak var dropoffStackView: UIStackView!
    @IBOutlet private weak var dividerView: UIView!
    @IBOutlet private weak var pickupLabel: Label!
    @IBOutlet private weak var dropoffLabel: Label!
    @IBOutlet private weak var rideUpdateButton: Button!
    @IBOutlet private var subtitleLabels: [Label]!
    @IBOutlet private weak var contactButton: Button!
    @IBOutlet private weak var cancelButton: Button!
    @IBOutlet private weak var contactCancelStackView: UIStackView!
    @IBOutlet weak var contactCancelStackHeight: NSLayoutConstraint!
    @IBOutlet private weak var paxLabel: Label!
    
    weak var delegate: CurrentRidesTableViewCellDelegate?

    private var rideID: String?
    private var isPickupStop: Bool?
    private var driverArrived: Bool?
    
    var timer: Timer?
    var timeLeft = 180
    
    override func awakeFromNib() {
        super.awakeFromNib()

        rideUpdateButton.style = .primary
        cancelButton.style = .cancel
        contactButton.style = .contact
        nameLabel.style = .subtitle3bluegray
        paxLabel.style = .subtitle8bluegray
        etaLabel.style = .subtitle2blue
        subtitleLabels.forEach { $0.style = .subtitle3blue }
        [pickupLabel, dropoffLabel].forEach { $0.style = .body2bluegray }
    }

    func configure(with action: Action) {
        rideID = action.rideId
        isPickupStop = action.isPickup
        driverArrived = action.status == .driverArrived
        
        if let name = action.riderName {
            nameLabel.text = "\(name.capitalized)"
        } else {
            nameLabel.text = "\(action.passengers) Hailed Rider\(action.passengers == 1 ? "" : "s")"
        }
        
        if action.isADA {
            nameLabel.text = "\(nameLabel.text ?? "") ♿"
        }
        
        paxLabel.text = "\(Int(action.passengers)) pax"
        
        if action.fixedStopId != nil {
            paxLabel.text = "\(paxLabel.text ?? "") • FS"
        }
        
        pickupLabel.text = action.originAddressShort
        dropoffLabel.text = action.destinationAddressShort
                
        if action.eta == nil {
            etaLabel.isHidden = true
        } else {
            etaLabel.isHidden = false
            if (driverArrived ?? false) && (isPickupStop ?? false) {
                etaLabel.text = "Waiting time: "
            } else {
                etaLabel.text = action.getETALabel()
            }
        }
        
        pickupStackView.isHidden = true
        dropoffStackView.isHidden = true
        contactCancelStackView.isHidden = true
        contactCancelStackHeight.constant = 0
        rideUpdateButton.isEnabled = true
        
        if action.isHailed {
            dividerView.isHidden = true
            rideUpdateButton.style = .primary
            rideUpdateButton.setTitle("Drop Off", for: .normal)
        } else {
            contactCancelStackHeight.constant = 39
            if action.isPickup {
                rideUpdateButton.style = .primary
                rideUpdateButton.setTitle(driverArrived ?? false ?  "Pick Up" : "Arrived", for: .normal)
                pickupStackView.isHidden = false
                cancelButton.isHidden = false
                contactButton.isHidden = false
                contactCancelStackView.isHidden = false
                contactButton.isEnabled = true
            } else if action.isDropoff {
                rideUpdateButton.style = .primary
                rideUpdateButton.setTitle("Drop Off", for: .normal)
                dropoffStackView.isHidden = false
                contactCancelStackView.isHidden = false
                cancelButton.isHidden = true
            }
            
            if !action.isCurrent && !action.isInProgress {
                rideUpdateButton.isEnabled = false
            }
            
            if action.isDropoff {
                contactButton.isEnabled = rideUpdateButton.isEnabled
            }
            
            contactButton.backgroundColor = contactButton.isEnabled ? Theme.Colors.kelp : Theme.Colors.gray
        }
        resetTimer()
        layoutIfNeeded()
    }
    
    func showTimer(with arrivedTime: Date) {
        resetTimer()
        timeLeft = Int(180 - Date().timeIntervalSince(arrivedTime))
        timer = Timer.scheduledTimer(timeInterval: 1.0, target: self, selector: #selector(updateTimer), userInfo: nil, repeats: true)
    }
    
    func resetTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    @objc func updateTimer()
    {
        let minutes = timeLeft / 60
        let seconds = timeLeft % 60
        etaLabel.text = "Waiting time: " + (minutes < 10 ? "0" + String(minutes) : String(minutes)) + ":" + (seconds < 10 ? "0" + String(seconds) : String(seconds))
        timeLeft -= 1
        if timeLeft < 0 {
            resetTimer()
            etaLabel.text = "You're waiting for over 3 minutes"
        }
    }

    
    @IBAction private func rideUpdateAction() {
        guard let rideID = rideID else {
            return
        }
        resetTimer()
        delegate?.didSelectActionUpdate(for: rideID, isPickupStop: isPickupStop ?? false, driverArrived: driverArrived ?? false, isFixedStop: false)
    }
    
    @IBAction private func contactAction() {
        guard let rideID = rideID else {
            return
        }
        delegate?.didSelectActionContact(for: rideID)
    }

    @IBAction private func cancelAction() {
        guard let rideID = rideID else {
            return
        }
        delegate?.didSelectActionCancel(for: rideID, driverArrived: driverArrived ?? false)
    }
}
