//
//  CustomInfoWindow.swift
//  FreeRide
//

import UIKit

protocol CustomInfoWindowDelegate: AnyObject {
    func hideMapInfo(isPickup: Bool)
    func startEditMode(isPickup: Bool)
}

class CustomInfoWindow: UIView {

    @IBOutlet weak var titleLabel: Label!
    @IBOutlet weak var infoLabel: Label!
    @IBOutlet weak var editButton: Button!
    @IBOutlet weak var hideButton: Button!
    
    weak var delegate: CustomInfoWindowDelegate?
    private var isPickup = true

    override func awakeFromNib() {
        super.awakeFromNib()
        editButton.setTitleColor(Theme.Colors.seaFoam, for: .normal)
        hideButton.setTitleColor(Theme.Colors.tangerine, for: .normal)
        infoLabel.style = .subtitle2darkgray
        titleLabel.font = Theme.Fonts.body3
        titleLabel.textColor = Theme.Colors.kelp
    }
    
    func update(marker: Marker, fixedStop: Bool) {
        let isPickup = marker.userData as? String == "origin"
        let markerTitleLabel = marker.title ?? "";
        titleLabel.text = isPickup ? "\("ride_pickup_at".localize()) \(markerTitleLabel)" : "\("ride_dropoff_at".localize()) \(markerTitleLabel)"
        if fixedStop {
            infoLabel.text = isPickup ? "ride_driver_pickup_fs".localize() : "ride_driver_dropoff_fs".localize()
        } else {
            infoLabel.text = isPickup ? "ride_driver_pickup".localize() : "ride_driver_dropoff".localize()
        }
        self.isPickup = isPickup
    }

    @IBAction private func hideAction() {
        delegate?.hideMapInfo(isPickup: self.isPickup)
    }
    
    
    @IBAction func editAction() {
        delegate?.startEditMode(isPickup: self.isPickup)
    }
    
}
