//
//  Defaults.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

public let Defaults = UserDefaults.standard

enum DefaultKey: String {

    case forgotPasswordAccessToken
    case userLatitude
    case userLongitude
    case deviceToken
    case deviceTokenRegistrationFailure
    case hasSeenDriverMessagePrompt
    case hasSeenPoolingInfoPopup
    case wasReviewedOnAppStore
    case lastThreeRatings
    case currentLocale
    case showAccessibilityOnRequest
    case requestingWheelchairAccess
    case requestingChildSeat
    case skipPhoneVerification
    case isDynamicRideSearch
    case flux
    case hideTripAlternativeSurvey
}

extension UserDefaults {

    public var isFirstAppSession: Bool {
        return userLatitude == nil && userLongitude == nil
    }

    public var forgotPasswordAccessToken: String? {
        get { return self[.forgotPasswordAccessToken] }
        set { self[.forgotPasswordAccessToken] = newValue }
    }

    public var userLatitude: Float? {
        get { return self[.userLatitude] }
        set { self[.userLatitude] = newValue }
    }

    public var userLongitude: Float? {
        get { return self[.userLongitude] }
        set { self[.userLongitude] = newValue }
    }

    public var deviceToken: String? {
        get { return self[.deviceToken] }
        set { self[.deviceToken] = newValue }
    }

    public var deviceTokenRegistrationFailure: String? {
        get { return self[.deviceTokenRegistrationFailure] }
        set { self[.deviceTokenRegistrationFailure] = newValue }
    }
    
    public var currentLocale: String? {
        get { return self[.currentLocale] }
        set { self[.currentLocale] = newValue }
    }

    public var hasSeenDriverMessagePrompt: String? {
        get { return self[.hasSeenDriverMessagePrompt] }
        set { self[.hasSeenDriverMessagePrompt] = newValue }
    }
    
    public var hasSeenPoolingInfoPopup: Bool {
        get { return self[.hasSeenPoolingInfoPopup] ?? false }
        set { self[.hasSeenPoolingInfoPopup] = newValue }
    }
    
    public var wasReviewedOnAppStore: Bool {
        get { return self[.wasReviewedOnAppStore] ?? false }
        set { self[.wasReviewedOnAppStore] = newValue }
    }
    
    public var showAccessibilityOnRequest: Bool {
        get { return self[.showAccessibilityOnRequest] ?? true }
        set { self[.showAccessibilityOnRequest] = newValue }
    }
    
    public var requestingWheelchairAccess: Bool {
        get { return self[.requestingWheelchairAccess] ?? false }
        set { self[.requestingWheelchairAccess] = newValue }
    }
    
    public var requestingChildSeat: Bool {
        get { return self[.requestingChildSeat] ?? false }
        set { self[.requestingChildSeat] = newValue }
    }
    
    public var lastThreeRatings: [Int]? {
        get { return self[.lastThreeRatings] ?? []}
        set { self[.lastThreeRatings] = newValue }
    }
    
    public var skipPhoneVerification: Bool {
        get { return self[.skipPhoneVerification] ?? false }
        set { self[.skipPhoneVerification] = newValue }
    }
    
    public var isDynamicRideSearch: Bool {
        get { return self[.isDynamicRideSearch] ?? false }
        set { self[.isDynamicRideSearch] = newValue }
    }
    
    public var flux: Bool {
        get { return self[.flux] ?? true }
        set { self[.flux] = newValue }
    }

    public var hideTripAlternativeSurvey: Bool {
        get { return self[.hideTripAlternativeSurvey] ?? true }
        set { self[.hideTripAlternativeSurvey] = newValue }
    }

    // MARK: - Support
    private subscript<T>(key: DefaultKey) -> T? {
        get { return object(forKey: key.rawValue) as? T }
        set { set(newValue, forKey: key.rawValue) }
    }
}
