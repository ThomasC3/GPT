//
//  ServiceDetailsView.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/15/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import GoogleMaps

class ServiceDetailsView: UIView {

    @IBOutlet private weak var mapView: MapView!
    @IBOutlet private weak var statusLabel: Label!
    @IBOutlet private weak var adaImageView: UIImageView!

    override func awakeFromNib() {
        super.awakeFromNib()

        constrainHeight(312)
    }

    func configure(with locationResponse: LocationResponse) {
        drawGeoFence(for: locationResponse)
        
        let location: Location
        
        #if RIDER
        location = Location(context: RiderAppContext.shared.dataStore.mainContext)
        #elseif DRIVER
        location = Location(context: DriverAppContext.shared.dataStore.mainContext)
        #endif
        
        location.update(with: locationResponse)
        
        statusLabel.text = location.statusLabel
        statusLabel.style = location.statusLabelStyle

        adaImageView.isHidden = !location.isADA
    }

    private func drawGeoFence(for location: LocationResponse) {
        guard !location.serviceArea.isEmpty else {
            return
        }
        
        let path = location.serviceAreaPath

        let polyline = GMSPolyline(path: path)
        polyline.strokeColor = Theme.Colors.kelp
        polyline.strokeWidth = 2.0
        polyline.map = mapView

        var bounds = GMSCoordinateBounds(path: path)
        
        if let styleURL = Bundle.main.url(forResource: "map_style", withExtension: "json") {
            mapView.styleMapUsing(fileAt:styleURL) {_ in }
        }
        mapView.markers.forEach { bounds = bounds.includingCoordinate($0.position) }
        mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 20, left: 20, bottom: 20, right: 20))
    }
}
