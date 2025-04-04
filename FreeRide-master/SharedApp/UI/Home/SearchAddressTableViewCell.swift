//
//  SearchAddressTableViewCell.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/16/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import CoreLocation
import UIKit

class SearchAddressTableViewCell: UITableViewCell {

    @IBOutlet private weak var badgeImageView: UIImageView!
    @IBOutlet private weak var titleLabel: Label!
    @IBOutlet private weak var subtitleLabel: Label!

    func configure(with item: SearchAddressItem, isPickup: Bool) {
        if let result = item.result {
            badgeImageView.image = isPickup ? #imageLiteral(resourceName: "round_near_me_black_24pt") : #imageLiteral(resourceName: "round_flag_black_24pt")

            titleLabel.text = result.attributedPrimaryText.string
            subtitleLabel.text = result.attributedSecondaryText?.string
        
            titleLabel.style = .body3bluegray
            subtitleLabel.style = .body2bluegray
        } else {
            let isLocationEnabled = CLLocationManager.locationServicesEnabledAndAppPermissionAuthorized()
            badgeImageView.image = #imageLiteral(resourceName: "round_my_location_black_24pt")
            badgeImageView.tintColor = isLocationEnabled ? Theme.Colors.seaFoam : Theme.Colors.coolGray

            titleLabel.text = "Use Current Location".localize()

            let enabledText = isPickup ? "Set as Pick Up".localize() : "Set as Drop Off".localize()
            subtitleLabel.text = isLocationEnabled ? enabledText : "Enable Location Settings".localize()

            titleLabel.style = isLocationEnabled ? .body3bluegray : .body3darkgray
            subtitleLabel.style = isLocationEnabled ? .body2bluegray : .body2darkgray
        }
    }
}
