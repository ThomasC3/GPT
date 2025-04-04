//
//  Marker.swift
//  MapView
//
//  Created by Andrew Boryk on 6/29/18.
//  Copyright © 2018 Rocket n Mouse. All rights reserved.
//

import GoogleMaps

public protocol Identifiable {
    
    /// An value that can be used to identify the marker
    var id: String? { get set }
}

open class Marker: GMSMarker, Identifiable {
    
    public var id: String?
    
    // MARK: - Initializers
    public convenience init(position: CLLocationCoordinate2D, map: GMSMapView, indicator: UIImage? = nil) {
        self.init()
        self.position = position
        self.map = map
        
        if let indicator = indicator {
            self.icon = indicator
        }
    }
    
    public convenience init(latitude: Double, longitude: Double, map: GMSMapView, indicator: UIImage? = nil) {
        let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        self.init(position: coordinate, map: map, indicator: indicator)
    }
    
    // MARK: - Shared
    public func removeFromMap() {
        map = nil
    }
}
