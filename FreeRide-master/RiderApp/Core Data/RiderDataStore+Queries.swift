//
//  RiderDataStore+Queries.swift
//  RiderApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension RiderDataStore {

    func currentUser() -> User? {
        return mainContext.fetchFirst(User.self)
    }

    func currentLocation() -> Location? {
        return mainContext.fetchFirst(Location.self)
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

    func fetchRides() -> [Ride] {
        let sortDescriptor = NSSortDescriptor(key: "createdTimestamp", ascending: false)
        return mainContext.fetch(Ride.self, nil, [sortDescriptor])
    }

    func wipeRides() {
        mainContext.wipeRides()
    }

    func fetchCurrentRide() -> Ride? {
        let predicate = NSPredicate(format: "statusValue != 700 AND statusValue != 701 AND statusValue != 101 AND statusValue != 204 AND statusValue != 205 AND statusValue != 206 AND statusValue != 207")
        let sortDescriptor = NSSortDescriptor(key: "createdTimestamp", ascending: false)
        return mainContext.fetchFirst(Ride.self, predicate, [sortDescriptor])
    }

    func fetchRide(id: String) -> Ride? {
        let predicate = NSPredicate(format: "%@ == id", id)
        return mainContext.fetchFirst(Ride.self, predicate)
    }

    func fetchUnratedRide() -> Ride? {
        let predicate = NSPredicate(format: "isRated == FALSE AND statusValue == 700")
        return mainContext.fetchFirst(Ride.self, predicate)
    }
}
