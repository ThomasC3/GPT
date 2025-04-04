//
//  ServiceHours.swift
//  RiderApp
//
//  Created by Andrew Boryk on 1/5/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class ServiceHours: NSManagedObject {

    @NSManaged var day: String
    @NSManaged var openTime: String
    @NSManaged var closeTime: String
    @NSManaged var closed: Bool
    @NSManaged var location: Location

    func update(with timeSlot: LocationResponse.TimeSlot) {
        day = timeSlot.day
        openTime = timeSlot.openTime
        closeTime = timeSlot.closeTime
        closed = timeSlot.closed
    }
}
