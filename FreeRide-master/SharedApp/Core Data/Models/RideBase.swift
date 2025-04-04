//
//  RideBase.swift
//  Circuit
//
//  Created by Andrew Boryk on 1/14/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class RideBase: NSManagedObject {

    enum Status: Int32 {
        case unknown =              0
        case rideRequested =        100
        case cancelledRequest =     101
        case rideAccepted =         102
        case rideInQueue =          200
        case nextInQueue =          201
        case driverEnRoute =        202
        case driverArrived =        203
        case cancelledInQueue =     204
        case cancelledEnRoute =     205
        case cancelledNoShow =      206
        case cancelledNotAble =     207
        case rideInProgress =       300
        case rideComplete =         700
        case rideCompleteRandom =   701
    }

    @NSManaged var id: String
    @NSManaged var originLatitude: Float
    @NSManaged var originLongitude: Float
    @NSManaged var destinationLatitude: Float
    @NSManaged var destinationLongitude: Float
    @NSManaged var isADA: Bool
    @NSManaged var statusValue: Int32
    @NSManaged var createdTimestamp: Date
    @NSManaged var passengers: Int32
    @NSManaged var driverArrivedTimestamp: Date?

    var status: Status {
        return Status(rawValue: statusValue) ?? .unknown
    }

    var isCancelled: Bool {
        switch status {
        case .cancelledRequest, .cancelledEnRoute, .cancelledInQueue, .cancelledNoShow, .cancelledNotAble:
            return true
        default:
            return false
        }
    }

    var isComplete: Bool {
        switch status {
        case .rideComplete, .rideCompleteRandom:
            return true
        default:
            return false
        }
    }

    var isWaiting: Bool {
        switch status {
        case .rideInQueue, .nextInQueue, .driverEnRoute:
            return true
        default:
            return false
        }
    }
    
    var isInQueue: Bool {
        switch status {
        case .rideInQueue, .nextInQueue:
            return true
        default:
            return false
        }
    }

    var isDriverEnRoute: Bool {
        switch status {
        case .driverEnRoute:
            return true
        default:
            return false
        }
    }

    var isDriverArrived: Bool {
        switch status {
        case .driverArrived:
            return true
        default:
            return false
        }
    }
    
    var isInProgress: Bool {
        switch status {
        case .rideInProgress:
            return true
        default:
            return false
        }
    }

}
