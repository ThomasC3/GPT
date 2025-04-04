//
//  MarkerInfoView.swift
//  FreeRide
//

import UIKit

class AddressInfoView: CardView {
    
    @IBOutlet weak var infoLabel: Label!
    
    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(35.0)
        infoLabel.font = Theme.Fonts.subtitle2
        infoLabel.textColor = Theme.Colors.kelp
        configure(isEditing: false, hasMarkers: false)
    }
    
    func configure(isEditing: Bool, hasMarkers: Bool) {
        if !hasMarkers {
            backgroundColor = Theme.Colors.coolGray
            infoLabel.text = "Search for pickup and dropoff spot"
            return
        }
        
        if isEditing {
            backgroundColor = Theme.Colors.sunshine
            infoLabel.text = "ride_tap_pin_to_set".localize()
        } else {
            backgroundColor = Theme.Colors.coolGray
            infoLabel.text = "ride_tap_pin_to_change".localize()
        }
    }

}
