//
//  User.swift
//  RiderApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class User: NSManagedObject {

    @NSManaged var id: String
    @NSManaged var firstName: String
    @NSManaged var lastName: String
    @NSManaged var email: String
    @NSManaged var zip: String
    @NSManaged var gender: String?
    @NSManaged var dob: String?
    @NSManaged var phone: String?
    @NSManaged var isPhoneVerified: Bool
    @NSManaged var google: String?
    @NSManaged var isEmailVerified: Bool
    @NSManaged var isPastEmailVerificationDeadline: Bool
    @NSManaged var emailVerificationDeadline: Date?
    @NSManaged var apple: String?
    @NSManaged var iosUserIntercomHash: String?

    var isSocialAuth: Bool {
        if let google {
            return !google.trim().isEmpty
        }
        if let apple {
            return !apple.trim().isEmpty
        }
        return false
    }

    func dateOfBirth() -> Date? {
        guard let dateOfBirthString = dob, !dateOfBirthString.isEmpty else {
            return nil
        }
        let dateFormatter = DateFormatter(dateFormat: dateOfBirthString.contains("-") ? "yyyy-MM-dd" : "MM/dd/yyyy")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        return dateFormatter.date(from: dateOfBirthString)
    }

    func hasDateOfBirth() -> Bool {
        return dateOfBirth() != nil
    }

    func update(with response: LoginResponse) {
        id = response.id
        firstName = response.firstName
        lastName = response.lastName
        email = response.email
        zip = response.zip
        gender = response.gender
        dob = response.dob
        phone = response.phone
        isPhoneVerified = response.isPhoneVerified
        google = response.google
        apple = response.apple
        iosUserIntercomHash = response.iosUserIntercomHash

        KeychainManager.shared.saveAccessToken(response.accessToken)

        managedObjectContext?.saveContext()
    }

    func update(with response: UserResponse) {
        id = response.id
        firstName = response.firstName
        lastName = response.lastName
        email = response.email
        zip = response.zip ?? ""
        gender = response.gender
        dob = response.dob
        phone = response.phone
        isPhoneVerified = response.isPhoneVerified
        google = response.google
        apple = response.apple
        isEmailVerified = response.isEmailVerified ?? true
        isPastEmailVerificationDeadline = response.isPastEmailVerificationDeadline ?? false
        emailVerificationDeadline = response.emailVerificationDeadline?.utcStringToDate()
        iosUserIntercomHash = response.iosUserIntercomHash

        if let accessToken = response.accessToken {
            KeychainManager.shared.saveAccessToken(accessToken)
        }

        managedObjectContext?.saveContext()
    }

    func update(with response: UpdateUserResponse) {
        firstName = response.firstName
        lastName = response.lastName
        email = response.email
        zip = response.zip
        gender = response.gender
        dob = response.dob

        managedObjectContext?.saveContext()
    }

    func update(with response: SocialAuthResponse) {
        guard
            let id = response.id,
            let firstName = response.firstName,
            let lastName = response.lastName,
            let email = response.email,
            let accessToken = response.accessToken
        else {
            return
        }

        self.id = id
        self.firstName = firstName
        self.lastName = lastName
        self.email = email
        self.zip = zip
        gender = response.gender
        self.dob = dob
        self.phone = response.phone
        isPhoneVerified = response.isPhoneVerified ?? false
        google = response.google
        apple = response.apple
        iosUserIntercomHash = response.iosUserIntercomHash

        KeychainManager.shared.saveAccessToken(accessToken)

        managedObjectContext?.saveContext()
    }

    func update(with response: PhoneVerifyResponse) {
        phone = response.phone
        isPhoneVerified = true

        managedObjectContext?.saveContext()
    }
    
    static func resetUserDefaults() {
        Defaults.hasSeenPoolingInfoPopup = false
        Defaults.wasReviewedOnAppStore = false
        Defaults.showAccessibilityOnRequest = true
        Defaults.requestingWheelchairAccess = false
        Defaults.requestingChildSeat = false
        Defaults.lastThreeRatings = []
    }
}
