//
//  DriverTableViewCell.swift
//  FreeRide
//

import UIKit

class DriverTableViewCell: UITableViewCell {

    @IBOutlet weak var iconView: UIImageView!
    @IBOutlet private weak var cardBackgroundView: CardView!
    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var descriptionLabel: Label!
    @IBOutlet weak var statusLabel: Label!
    
    func configure(with driver: DriverResponse) {
        cardBackgroundView.backgroundColor = Theme.Colors.white
        nameLabel.style = .body5bluegray
        descriptionLabel.style = .body2bluegray
        nameLabel.text = driver.name
        descriptionLabel.text = "Offline since \(driver.loggedOutTimestamp?.utcStringToLocalHour() ?? "-")"
        iconView.tintColor = Theme.Colors.blueGray
        iconView.image = driver.getImage()
        statusLabel.style = .body2bluegray
        statusLabel.text = driver.status
        statusLabel.textColor = driver.isAvailable ? Theme.Colors.seaFoam : Theme.Colors.tangerine
    }

}

