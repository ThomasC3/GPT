//
//  LocationsTableViewCell.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/22/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol LocationsTableViewCellDelegate: AnyObject {
    func didSelectInfoButton(in cell: LocationsTableViewCell)
}

class LocationsTableViewCell: UITableViewCell {

    @IBOutlet private weak var cardBackgroundView: CardView!
    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var activeLabel: Label!
    @IBOutlet private weak var infoButton: Button!

    weak var delegate: LocationsTableViewCellDelegate?

    func configure(with locationResponse: LocationResponse) {
        let currentLocationID: String?
        
        #if RIDER
        currentLocationID = RiderAppContext.shared.currentLocation?.id
        #elseif DRIVER
        currentLocationID = DriverAppContext.shared.currentLocation?.id
        #endif

        let isCurrentLocation = locationResponse.id == currentLocationID

        cardBackgroundView.backgroundColor = isCurrentLocation ? Theme.Colors.seaFoam : Theme.Colors.white

        nameLabel.style = isCurrentLocation ? .title2white : .title2bluegray

        infoButton.setImage(#imageLiteral(resourceName: "round_info_black_36pt"), for: .normal)
        infoButton.tintColor = isCurrentLocation ? Theme.Colors.white : Theme.Colors.seaFoam

        nameLabel.text = locationResponse.name
        activeLabel.text = isCurrentLocation ? "Current Location".localize() : locationResponse.statusLabel
        activeLabel.style = isCurrentLocation ? .subtitle1white : locationResponse.statusLabelStyle
    }

    @IBAction private func infoAction() {
        delegate?.didSelectInfoButton(in: self)
    }
}
