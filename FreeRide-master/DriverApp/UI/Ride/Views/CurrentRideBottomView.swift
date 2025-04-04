//
//  CurrentRideBottomView.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol CurrentRideBottomViewDelegate: AnyObject {
    func didSelectRideUpdate()
    func didSelectContact()
    func didSelectCancel()
}

class CurrentRideBottomView: CardView {

    @IBOutlet private weak var etaLabel: Label!
    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var rideUpdateButton: Button!
    @IBOutlet private weak var paxLabel: Label!
    @IBOutlet private weak var destinationLabel: Label!
    @IBOutlet private weak var contactButton: Button!
    @IBOutlet private weak var cancelButton: Button!
    @IBOutlet private weak var contactCancelStackView: UIStackView!

    weak var delegate: CurrentRideBottomViewDelegate?
    
    var timer: Timer?
    var timeLeft = 180

    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(250)
        nameLabel.style = .subtitle3bluegray
        destinationLabel.style = .subtitle6bluegray
        paxLabel.style = .subtitle8bluegray
        cancelButton.style = .cancel
        contactButton.style = .contact
        rideUpdateButton.style = .primary
        etaLabel.style = .subtitle3blue
    }
    
    func configure(with action: Action) {

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

        cancelButton.isHidden = action.riderName == nil
        contactButton.isHidden = action.riderPhone == nil
        contactCancelStackView.isHidden = (cancelButton.isHidden && contactButton.isHidden)
        
        rideUpdateButton.isHidden = false

        destinationLabel.text = ""
        
        if action.eta == nil || (action.isDriverArrived && action.isPickup) {
            etaLabel.isHidden = true
        } else {
            etaLabel.isHidden = false
            etaLabel.text = action.getETALabel()
        }

        if action.isWaiting {
            rideUpdateButton.setTitle("Arrived", for: .normal)
            
            if let address = action.originAddress {
                destinationLabel.text = address
            }
            
        } else if action.isDriverArrived {
            rideUpdateButton.setTitle("Pick Up", for: .normal)
            destinationLabel.text = "Waiting time: "
        } else if action.isInProgress {
            rideUpdateButton.setTitle("Drop Off", for: .normal)

            if let address = action.destinationAddress {
                destinationLabel.text = address
            } else {
                destinationLabel.text = "Dropping off\nAsk rider for destination"
            } 
            
            cancelButton.isHidden = true
            
        } else {
            rideUpdateButton.isHidden = true
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
    
    @objc func updateTimer() {
        let minutes = timeLeft / 60
        let seconds = timeLeft % 60
        destinationLabel.text = "Waiting time: " + (minutes < 10 ? "0" + String(minutes) : String(minutes)) + ":" + (seconds < 10 ? "0" + String(seconds) : String(seconds))
        timeLeft -= 1
        if timeLeft < 0 {
            resetTimer()
            destinationLabel.text = "You're waiting for over 3 minutes"
        }
    }

    @IBAction private func rideUpdateAction() {
        resetTimer()
        delegate?.didSelectRideUpdate()
    }

    @IBAction private func contactAction() {
        delegate?.didSelectContact()
    }

    @IBAction private func cancelAction() {
        delegate?.didSelectCancel()
    }
}
