//
//  LocationUnavailableView.swift
//  FreeRide
//
//  Created by Rui Magalhães on 22/10/2019.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class LocationUnavailableView: CardView {

    @IBOutlet private weak var locationLabel: Label?
    @IBOutlet private weak var infoLabel: Label?
    
    func configure(with location: Location) {
        locationLabel?.text = location.statusLabel
        infoLabel?.text = location.statusCopy
        locationLabel?.style = location.statusLabelStyle
    }
    
    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(130)
        locationLabel?.style = .subtitle1lightred
        infoLabel?.style = .subtitle3bluegray
    }
}
