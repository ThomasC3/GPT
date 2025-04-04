//
//  Coordinate.swift
//  RiderApp
//
//  Created by Andrew Boryk on 1/5/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class Coordinate: NSManagedObject {

    @NSManaged var index: Int32
    @NSManaged var latitude: Float
    @NSManaged var longitude: Float
    @NSManaged var location: Location

    func update(with geo: LocationResponse.GeoCoordinate, index: Int) {
        self.index = Int32(index)
        latitude = geo.latitude
        longitude = geo.longitude
    }
}

