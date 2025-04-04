//
//  User.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

extension Notification.Name {
    static let didUpdateDriverStatus = Notification.Name("didUpdateDriverStatus")
}

class User: NSManagedObject {

    @NSManaged var id: String
    @NSManaged var firstName: String
    @NSManaged var lastName: String
    @NSManaged var displayName: String
    @NSManaged var email: String
    @NSManaged var zip: String
    @NSManaged var gender: String?
    @NSManaged var dob: String?
    @NSManaged var phone: String?
    @NSManaged var locations: [String]
    @NSManaged var accessToken: String
    @NSManaged var isOnline: Bool
    @NSManaged var isAvailable: Bool
    @NSManaged var unavailabilityReasons: [String]
    @NSManaged var activeLocation: String?

    var hasActiveLocation: Bool {
        return activeLocation != nil
    }

    func update(with response: LoginResponse) {
        id = response.id
        firstName = response.firstName
        lastName = response.lastName
        displayName = response.displayName
        email = response.email
        zip = response.zip
        gender = response.gender
        dob = response.dob
        phone = response.phone
        locations = response.locations
        isOnline = response.isOnline
        isAvailable = false
        unavailabilityReasons = []
        
        KeychainManager.shared.saveAccessToken(response.accessToken)

        managedObjectContext?.saveContext()
    }

    func update(with response: UserResponse) {
        id = response.id
        firstName = response.firstName
        lastName = response.lastName
        displayName = response.displayName
        email = response.email
        locations = response.location
        activeLocation = response.activeLocation

        managedObjectContext?.saveContext()
    }

    func update(with response: UpdateDriverResponse) {
        firstName = response.firstName
        lastName = response.lastName
        displayName = response.displayName

        managedObjectContext?.saveContext()
    }

    func update(with response: PhoneVerifyResponse) {
        phone = response.phone

        managedObjectContext?.saveContext()
    }
    
    func update(with response: DriverStatusResponse) {
        isAvailable = response.isAvailable
        unavailabilityReasons = response.unavailabilityReasons ?? []

        managedObjectContext?.saveContext()
    }

    static func resetUserDefaults() {
        Defaults.userLatitude = nil
        Defaults.userLongitude = nil
    }
}
