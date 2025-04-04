//
//  GroupActionsTableViewCell.swift
//  FreeRide
//


import UIKit

class ActionGroupTableViewCell: UITableViewCell {

    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var etaLabel: Label!
    @IBOutlet private weak var rideUpdateButton: Button!
    @IBOutlet private weak var cellStack: UIStackView!
    @IBOutlet private weak var paxLabel: Label!
    @IBOutlet private weak var stopsLabel: Label!
    
    weak var delegate: CurrentRidesTableViewCellDelegate?

    private var fixedStopId: String?
    private var isPickupStop: Bool?
    private var driverArrived: Bool?
    
    var actionGroup : [Action] = []
    
    var timer: Timer?
    var timeLeft = 200
    
    override func awakeFromNib() {
        super.awakeFromNib()

        rideUpdateButton.style = .primary
        nameLabel.style = .body5darkgray
        paxLabel.style = .subtitle8bluegray
        etaLabel.style = .subtitle3blue
        stopsLabel.style = .subtitle3blue
        rideUpdateButton.style = .primary
    }

    func configure(with group: [Action]) {
        
        actionGroup = group
        
        guard let firstAction = actionGroup.first else {
            return
        }
        
        fixedStopId = firstAction.fixedStopId
        isPickupStop = firstAction.isPickup
        driverArrived = firstAction.isDriverArrived
        let isHailed = firstAction.isHailed
         
        rideUpdateButton.isEnabled = firstAction.isCurrent

        if isHailed {
            nameLabel.text = "Hailed Ride"
            stopsLabel.text = "\(firstAction.passengers) passengers"
            rideUpdateButton.isHidden = true
        } else {
            let singleAction = actionGroup.count == 1
            if firstAction.isPickup {
                rideUpdateButton.setTitle(driverArrived ?? false ?  "Pick Up \(actionGroup.count) Rides" : "Arrived", for: .normal)
                stopsLabel.text = "\(actionGroup.count) ride\(singleAction ? "": "s") to pick up"
                nameLabel.text = firstAction.originAddress
            } else if firstAction.isDropoff {
                rideUpdateButton.setTitle("Drop Off \(actionGroup.count) Rides", for: .normal)
                stopsLabel.text = "\(actionGroup.count) ride\(singleAction ? "": "s") to drop off"
                nameLabel.text = firstAction.destinationAddress
            }
            rideUpdateButton.isHidden = singleAction
        }
        
        if firstAction.eta == nil {
            etaLabel.isHidden = true
        } else {
            etaLabel.isHidden = false
            if (driverArrived ?? false) && (isPickupStop ?? false) {
                etaLabel.text = "Waiting time: "
            } else {
                etaLabel.text = firstAction.getETALabel()
            }
        }
        
        for view in cellStack.subviews as [UIView] {
            if let actions = view as? FixedStopActionView {
                actions.removeFromSuperview()
            }
        }
        
        let hideArrivedButton = actionGroup.count > 1 && !(driverArrived ?? true)
        
        var passengers = 0
        var showWAV = false
        
        for action in actionGroup {
            let view: FixedStopActionView = .instantiateFromNib()
            view.translatesAutoresizingMaskIntoConstraints = false
            view.configure(with: action, isCurrent: firstAction.isCurrent, hideArrived: hideArrivedButton)
            view.constrainHeight(action.isHailed ? 50 : 120)
            view.delegate = self
            cellStack.addArrangedSubview(view)
            passengers += Int(action.passengers)
            if action.isADA {
                showWAV = true
            }
        }
        if showWAV {
            nameLabel.text = "\(nameLabel.text ?? "") ♿"
        }
        
        paxLabel.text = "\(passengers) pax"
        
        if fixedStopId != nil {
            paxLabel.text = "\(paxLabel.text ?? "") • FS"
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
    
    @IBAction private func actionGroupUpdateAction() {
        
        guard let fixedStopId = fixedStopId else {
            return
        }
        delegate?.didSelectActionUpdate(for: fixedStopId, isPickupStop: isPickupStop ?? false, driverArrived: driverArrived ?? false, isFixedStop: true)
    }

}

extension ActionGroupTableViewCell: ActionGroupTableViewCellDelegate {
    func didSelectActionUpdate(for rideID: String) {
        delegate?.didSelectActionUpdate(for: rideID, isPickupStop: isPickupStop ?? false, driverArrived: driverArrived ?? false, isFixedStop: false)
    }
    
    func didSelectActionContact(for rideID: String) {
        delegate?.didSelectActionContact(for: rideID)
    }
    
    func didSelectActionCancel(for rideID: String) {
        delegate?.didSelectActionCancel(for: rideID, driverArrived: driverArrived ?? false)
    }
    
}
