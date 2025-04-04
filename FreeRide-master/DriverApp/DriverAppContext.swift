//
//  DriverAppContext.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

class DriverAppContext: AppContext {

    static let shared = DriverAppContext(
        api: ServerAPI(),
        dataStore: DriverDataStore(),
        keychainManager: KeychainManager.shared
    )

    let dataStore: DriverDataStore

    private let keychainManager: KeychainManager

    lazy var socket = DriverSocket()

    init(api: ServerAPI, dataStore: DriverDataStore, keychainManager: KeychainManager) {
        self.dataStore = dataStore
        self.keychainManager = keychainManager
        super.init(api: api)
    }

    var isLoggedIn: Bool {
        return KeychainManager.shared.getAccessToken() != nil && dataStore.currentUser() != nil
    }

    var currentUser: User {
        return dataStore.currentUser() ?? User(context: dataStore.mainContext)
    }

    var currentLocation: Location? {
        return dataStore.currentLocation()
    }
    
    var currentVehicle: Vehicle? {
        return dataStore.currentVehicle()
    }
    
}
