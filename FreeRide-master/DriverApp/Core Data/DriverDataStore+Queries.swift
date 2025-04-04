//
//  DriverDataStore+Queries.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension DriverDataStore {

    func currentUser() -> User? {
        return mainContext.fetchFirst(User.self)
    }

    func currentLocation() -> Location? {
        return mainContext.fetchFirst(Location.self)
    }
    
    func currentVehicle() -> Vehicle? {
        return mainContext.fetchFirst(Vehicle.self)
    }

    func wipeAllUsersExcept(id: String) {
        let predicate = NSPredicate(format: "%@ != id", id)

        mainContext.fetch(User.self, predicate).forEach {
            mainContext.delete($0)
        }

        save()
    }

    func wipeLocation() {
        mainContext.wipeLocation()
    }

    func wipeLocationDetails() {
        mainContext.wipeLocationDetails()
    }
    
    func wipeVehicles() {
        mainContext.wipeVehicles()
    }

    func fetchRides() -> [Ride] {
        return mainContext.fetch(Ride.self)
    }

    func fetchCurrentRide() -> Ride? {
        let currentRides = fetchCurrentRides()
        let currentRide = currentRides.filter({ $0.isCurrent }).first
        if currentRide == nil && !currentRides.isEmpty {
            var queuedRides = "QUEUE: "
            for ride in currentRides {
                queuedRides = queuedRides + "RIDE_ID:\(ride.id) - IS_CURRENT:\(ride.isCurrent)::"
            }
            return currentRides.first
        }
        
        return currentRide
    }

    func fetchCurrentRides() -> [Ride] {
        let predicate = NSPredicate(format: "statusValue != 700 AND statusValue != 701 AND statusValue != 101 AND statusValue != 204 AND statusValue != 205 AND statusValue != 206 AND statusValue != 207")
        let sortDescriptor = NSSortDescriptor(key: "index", ascending: true)
        return mainContext.fetch(Ride.self, predicate, [sortDescriptor])
    }

    func fetchRide(id: String) -> Ride? {
        let predicate = NSPredicate(format: "%@ == id", id)
        return mainContext.fetchFirst(Ride.self, predicate)
    }

    func wipeCurrentRides() {
        fetchCurrentRides().forEach {
            mainContext.delete($0)
        }

        save()
    }
    
    
    func fetchActions() -> [Action] {
        return mainContext.fetch(Action.self)
    }
    
    func fetchCurrentAction() -> Action? {
        return fetchCurrentActions().filter({ $0.isCurrent }).first
    }

    func fetchCurrentActions() -> [Action] {
        let predicate = NSPredicate(format: "statusValue != 700 AND statusValue != 701 AND statusValue != 101 AND statusValue != 204 AND statusValue != 205 AND statusValue != 206 AND statusValue != 207")
        let sortDescriptor = NSSortDescriptor(key: "index", ascending: true)
        return mainContext.fetch(Action.self, predicate, [sortDescriptor])
    }
    
    func fetchActionGroups() -> [[Action]] {
        var actionGroups = [[Action]]()
        var lastStopId = ""
        var lastStopType = ""
        let actions = fetchCurrentActions()
        
        for action in actions {
            if let fixedStopId = action.fixedStopId, let actionType = action.stopType {
                if fixedStopId == lastStopId && actionType == lastStopType {
                    actionGroups[actionGroups.count - 1].append(action)
                } else {
                    actionGroups.append([action])
                }
            } else {
                actionGroups.append([action])
            }
            lastStopId = action.fixedStopId ?? ""
            lastStopType = action.stopType ?? ""
        }
        return actionGroups
    }

    func fetchAction(rideId: String) -> Action? {
        let predicate = NSPredicate(format: "%@ == rideId", rideId)
        return mainContext.fetchFirst(Action.self, predicate)
    }
    
    func fetchAction(id: String) -> Action? {
        let predicate = NSPredicate(format: "%@ == id", id)
        return mainContext.fetchFirst(Action.self, predicate)
    }

    func wipeCurrentActions() {
        fetchCurrentActions().forEach {
            mainContext.delete($0)
        }

        save()
    }
    
}
