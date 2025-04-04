//
//  CLLocationCoordinate2D+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/16/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import CoreLocation

extension CLLocationCoordinate2D {

    init(latitude: Float, longitude: Float) {
        self.init(latitude: CLLocationDegrees(latitude), longitude: CLLocationDegrees(longitude))
    }
}
