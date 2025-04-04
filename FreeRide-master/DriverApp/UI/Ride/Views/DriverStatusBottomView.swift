//
//  DriverStatusBottomView.swift
//  FreeRide
//

import UIKit

protocol DriverStatusBottomViewDelegate: AnyObject {
    func checkInVehicle()
}

class DriverStatusBottomView: CardView {

    weak var delegate: DriverStatusBottomViewDelegate?
    
    @IBOutlet weak var vehicleIcon: UIImageView!
    @IBOutlet private weak var titleLabel: Label!
    @IBOutlet var subtitleLabel: Label!
    @IBOutlet private weak var vehicleButton: Button?
    
    private var isAvailable: Bool?
    
    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(250)
        titleLabel.style = .body5bluegray
        subtitleLabel.style = .subtitle1blue
        subtitleLabel.textColor = Theme.Colors.darkGray
        vehicleButton?.style = .cancel
        vehicleButton?.setTitle("Check In Vehicle", for: .normal)
    }
    
    func configure(with isAvailable: Bool, vehicle: Vehicle?) {
        self.isAvailable = isAvailable
        guard let isCurrentlyAvailable = self.isAvailable, let currentVehicle = vehicle else {
            return
        }

        titleLabel.text = "Vehicle in use: \(currentVehicle.name) (\(currentVehicle.publicId))\nService: \(currentVehicle.service ?? "-")"

        if let matchingRule = currentVehicle.matchingRule {
            titleLabel.text! += "\nMatching Policy: \(matchingRule.title)"
        }

        if let zones = currentVehicle.zones, !zones.isEmpty {
            titleLabel.text! += "\nAssigned Zones: \(zones.map({ $0.name }).joined(separator: ", "))"
        }
        
        if isCurrentlyAvailable {
            subtitleLabel.text = "You are currently available and ready to get rides. You can change your availability on the side menu."
            vehicleButton?.isHidden = true
        } else {
            subtitleLabel.text = "You are currently unavailable. Change your availability on the menu or check in your vehicle."
            vehicleButton?.isHidden = false
        }
    }
        
    @IBAction private func vehicleCheckInAction() {
        delegate?.checkInVehicle()
    }
 
}
