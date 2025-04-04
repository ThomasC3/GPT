//
//  Defaults.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/18/18.
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

    // MARK: - Support
    private subscript<T>(key: DefaultKey) -> T? {
        get { return object(forKey: key.rawValue) as? T }
        set { set(newValue, forKey: key.rawValue) }
    }
}
