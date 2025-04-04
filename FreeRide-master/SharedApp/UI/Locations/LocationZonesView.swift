//
//  LocationZonesView.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 05/07/2023.
//  Copyright © 2023 Circuit. All rights reserved.
//

import UIKit

class LocationZonesView: UIView {

    @IBOutlet weak var zonesStackView: UIStackView!
    @IBOutlet weak var titleLabel: Label!

    override func awakeFromNib() {
        super.awakeFromNib()
        titleLabel.style = .subtitle6bluegray
        titleLabel.text = "Zones".localize()
    }

    func configure(zones: [ZoneResponse]) {
        zonesStackView.arrangedSubviews.forEach { view in
            view.removeFromSuperview()
        }

        let zonesLabel = Label()
        zonesLabel.numberOfLines = 0
        zonesLabel.style = .subtitle1darkgray
        zonesLabel.text = zones.map({ $0.name }).joined(separator: ", ")
        zonesStackView.addArrangedSubview(zonesLabel)
    }

}
