//
//  VehicleCheckOutBottomView.swift
//  FreeRide
//

import UIKit

protocol VehicleCheckOutBottomViewDelegate: AnyObject {
    func startVehicleCheckOut()
}

class VehicleCheckOutBottomView: CardView {

    weak var delegate: VehicleCheckOutBottomViewDelegate?
    
    @IBOutlet var subtitleLabel: Label!
    @IBOutlet private weak var vehicleCheckOutButton: Button?
    
    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(180)
        subtitleLabel.style = .subtitle3blue
        subtitleLabel.textColor = Theme.Colors.darkGray
        vehicleCheckOutButton?.accessibilityIdentifier = "checkOutVehicleButton"
        vehicleCheckOutButton?.style = .primary
        vehicleCheckOutButton?.setTitle("Check Out Vehicle", for: .normal)
    }
    
    func configure(with location: Location?) {
        guard let location = location else {
            return
        }
        subtitleLabel.text = "Check out a vehicle from \(location.name), select your service and complete the inspection to start picking up rides."
    }
        
    @IBAction private func vehicleCheckOutAction() {
        delegate?.startVehicleCheckOut()
    }
}
