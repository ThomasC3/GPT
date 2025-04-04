//
//  MarkerInfoView.swift
//  Circuit
//
//  Created by Andrew Boryk on 1/5/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import GoogleMaps

class MarkerInfoView: CardView {

    @IBOutlet private weak var titleLabel: Label!

    var isOrigin: Bool = false

    var isAvailable: Bool = false {
        didSet {
            updateStyle()
        }
    }

    override func awakeFromNib() {
        super.awakeFromNib()

        updateStyle()
    }

    func configure(title: String) {
        titleLabel.text = title

        if title == "Outside Service Area".localize() {
            frame.size.width = 140
        }
    }

    func updatePosition(mapView: GMSMapView, marker: GMSMarker) {
        center = mapView.projection.point(for: marker.position)
        center.y = center.y - 76
    }

    private func updateStyle() {
        titleLabel.style = isAvailable ? .subtitle2darkgray : .subtitle2gray
    }
}
