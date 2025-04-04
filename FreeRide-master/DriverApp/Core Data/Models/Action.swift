//
//  Action.swift
//  FreeRide
//
//  Created by Rui Magalhães on 08/10/2019.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class Action: RideBase {
    
    @NSManaged var riderName: String?
    @NSManaged var riderPhone: String?
    @NSManaged var originAddress: String?
    @NSManaged var destinationAddress: String?
    @NSManaged var index: Int32
    @NSManaged var isCurrent: Bool
    @NSManaged var isHailed: Bool
    @NSManaged var stopType: String?
    @NSManaged var eta: String?
    @NSManaged var rideId: String?
    @NSManaged var fixedStopId: String?

    var isPickup: Bool {
        return stopType == "pickup"
    }
    
    var isDropoff: Bool {
        return stopType == "dropoff"
    }
    
    var originAddressShort: String? {
        return originAddress?.components(separatedBy: ",").first
    }

    var destinationAddressShort: String? {
        return destinationAddress?.components(separatedBy: ",").first
    }

    func update(with response: RideHailResponse) {
        id = response.id
        isADA = response.isADA
        passengers = Int32(response.passengers)
        statusValue = 300
        createdTimestamp = Date()
        fixedStopId = response.id //replace for id coming on the response
    }

    func update(with response: RideUpdatesResponse) {
        statusValue = Int32(response.status)
        driverArrivedTimestamp = response.driverArrivedTimestamp?.utcStringToDate()
    }

    func update(with response: GetActionsResponse) {
        rideId = response.id
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
        stopType = response.stopType
        isHailed = response.hailed
        eta = response.eta
        driverArrivedTimestamp = response.driverArrivedTimestamp?.utcStringToDate()
        fixedStopId = response.fixedStopId
    }
    
    func getETALabel() -> String {

        let formatterRaw = DateFormatter()
        formatterRaw.dateFormat =  "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        
        guard let eta = eta, let actionEtaDate = formatterRaw.date(from: eta) else {
            return ""
        }
        
        let formatterPrint = DateFormatter()
        formatterPrint.dateFormat =  "h:mm a"
        return "Arriving at \(formatterPrint.string(from: actionEtaDate))"
    }
    
}

