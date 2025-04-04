//
//  Ride.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class Ride: RideBase {

    @NSManaged var riderName: String?
    @NSManaged var riderPhone: String?
    @NSManaged var originAddress: String?
    @NSManaged var destinationAddress: String?
    @NSManaged var index: Int32
    @NSManaged var isCurrent: Bool

    var originAddressShort: String? {
        return originAddress?.components(separatedBy: ",").first
    }

    var destinationAddressShort: String? {
        return destinationAddress?.components(separatedBy: ",").first
    }

    func update(with response: RideReceivedResponse) {
        id = response.ride
        riderName = response.rider.name
        riderPhone = response.rider.phone
        originAddress = response.origin.address
        originLatitude = response.origin.latitude
        originLongitude = response.origin.longitude
        destinationAddress = response.destination.address
        destinationLatitude = response.destination.latitude
        destinationLongitude = response.destination.longitude
        isADA = response.isADA
        passengers = Int32(response.passengers)
        statusValue = Int32(response.status)
        createdTimestamp = response.createdTimestamp
    }

    func update(with response: RideHailResponse) {
        id = response.id
        isADA = response.isADA
        passengers = Int32(response.passengers)
        statusValue = 300
        createdTimestamp = Date()
    }

    func update(with response: RideUpdatesResponse) {
        statusValue = Int32(response.status)
        driverArrivedTimestamp = response.driverArrivedTimestamp?.utcStringToDate()
    }

    func update(with response: GetRidesResponse) {
        id = response.id
        riderName = response.rider?.name
        riderPhone = response.rider?.phone
        originAddress = response.origin?.address
        originLatitude = response.origin?.latitude ?? 0
        originLongitude = response.origin?.longitude ?? 0
        destinationAddress = response.destination?.address
        destinationLatitude = response.destination?.latitude ?? 0
        destinationLongitude = response.destination?.longitude ?? 0
        isADA = response.isADA
        passengers = Int32(response.passengers)
        statusValue = Int32(response.status)
        createdTimestamp = response.createdTimestamp
        isCurrent = response.current
        driverArrivedTimestamp = response.driverArrivedTimestamp?.utcStringToDate()
    }
    
    func update(with action: Action) {
        guard let rideId = action.rideId else {
            return;
        }
        id = rideId
        riderName = action.riderName
        riderPhone = action.riderPhone
        originAddress = action.originAddress
        originLatitude = action.originLatitude
        originLongitude = action.originLongitude
        destinationAddress = action.destinationAddress
        destinationLatitude = action.destinationLatitude
        destinationLongitude = action.destinationLongitude
        isADA = action.isADA
        passengers = action.passengers
        statusValue = action.statusValue
        createdTimestamp = action.createdTimestamp
        isCurrent = action.isCurrent
        driverArrivedTimestamp = action.driverArrivedTimestamp
    }
}
