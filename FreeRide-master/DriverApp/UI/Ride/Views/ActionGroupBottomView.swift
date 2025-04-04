//
//  CurrentGroupActionsBottomView.swift
//  FreeRide
//

import UIKit

protocol ActionGroupBottomViewDelegate: AnyObject {
    func didSelectGroupUpdate(for actionGroup: [Action])
    func didSelectGroupContact(for actionGroup: [Action])
    func didSelectGroupCancel(for actionGroup: [Action])
}

class ActionGroupBottomView: CardView {

    @IBOutlet private weak var etaLabel: Label!
    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var actionGroupUpdateButton: Button!
    @IBOutlet private weak var passengersLabel: Label!
    @IBOutlet private weak var actionContactButton: Button!
    @IBOutlet private weak var actionCancelButton: Button!
    @IBOutlet private weak var bottomStack: UIStackView!
    
    @IBOutlet weak var paxLabel: Label!

    weak var delegate: ActionGroupBottomViewDelegate?
    
    private var fixedStopId: String?
    private var isPickupStop: Bool?
    private var driverArrived: Bool?
    
    var actionGroup : [Action] = []
    
    var timer: Timer?
    var timeLeft = 180
    
    override func awakeFromNib() {
        super.awakeFromNib()

        nameLabel.style = .body5darkgray
        paxLabel.style = .body5bluegray
        passengersLabel.style = .subtitle3blue
        actionGroupUpdateButton.style = .primary
        actionCancelButton.style = .cancel
        actionContactButton.style = .contact
        etaLabel.style = .subtitle3blue
    }
    
    func configure(with group: [Action]) {

        actionGroup = group
        
        guard let firstAction = actionGroup.first else {
            return
        }
        
        let singleAction = actionGroup.count == 1
    
        if firstAction.isPickup {
            bottomStack.isHidden = false
            nameLabel.text = firstAction.originAddress
            passengersLabel.text = singleAction ? "1 rider to pick up: \(firstAction.riderName ?? "")" : "\(actionGroup.count) rides to pick up"
            if firstAction.isDriverArrived {
                actionGroupUpdateButton.setTitle("Pick Up\(singleAction ? "" : " All Rides")", for: .normal)
            } else {
                actionGroupUpdateButton.setTitle("Arrived", for: .normal)
            }
        } else {
            bottomStack.isHidden = true
            nameLabel.text = firstAction.destinationAddress
            passengersLabel.text = singleAction ? "1 rider to drop off: \(firstAction.riderName ?? "")" : "\(actionGroup.count) rides to drop off"
            actionGroupUpdateButton.setTitle("Drop Off\(singleAction ? "" : " All Rides")", for: .normal)
        }
        
        if firstAction.eta == nil || (firstAction.isDriverArrived && firstAction.isPickup) {
            etaLabel.isHidden = true
        } else {
            etaLabel.isHidden = false
            etaLabel.text = firstAction.getETALabel()
        }
        
        var passengers = 0
        var showWAV = false
        
        for action in actionGroup {
            passengers += Int(action.passengers)
            if action.isADA {
                showWAV = true
            }
        }
        
        if showWAV {
            nameLabel.text = "\(nameLabel.text ?? "") ♿"
        }
        
        paxLabel.text = "\(passengers) pax"
        
        if firstAction.fixedStopId != nil {
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
    
    @objc func updateTimer() {
        let minutes = timeLeft / 60
        let seconds = timeLeft % 60
        passengersLabel.text = "Waiting time: " + (minutes < 10 ? "0" + String(minutes) : String(minutes)) + ":" + (seconds < 10 ? "0" + String(seconds) : String(seconds))
        timeLeft -= 1
        if timeLeft < 0 {
            resetTimer()
            passengersLabel.text = "You're waiting for over 3 minutes"
        }
    }
    
    @IBAction private func actionGroupUpdateAction() {
        guard !actionGroup.isEmpty else {
            return
        }
        delegate?.didSelectGroupUpdate(for: actionGroup)
    }

    @IBAction private func contactAction() {
        guard !actionGroup.isEmpty else {
            return
        }
        delegate?.didSelectGroupContact(for: actionGroup)
    }

    @IBAction private func cancelAction() {
        guard !actionGroup.isEmpty else {
            return
        }
        delegate?.didSelectGroupCancel(for: actionGroup)
    }
}
