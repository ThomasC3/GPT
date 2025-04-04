//
//  RiderAppContext.swift
//  RiderApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

class RiderAppContext: AppContext {

    // Shared instance with default dependencies.
    static let shared = RiderAppContext(
        api: ServerAPI(),
        dataStore: RiderDataStore(),
        keychainManager: KeychainManager.shared
    )

    let dataStore: RiderDataStore

    private let keychainManager: KeychainManager
    
    lazy var socket = RiderSocket()

    init(api: ServerAPI, dataStore: RiderDataStore, keychainManager: KeychainManager) {
        self.dataStore = dataStore
        self.keychainManager = keychainManager
        super.init(api: api)
    }

    var isLoggedIn: Bool {
        return keychainManager.getAccessToken() != nil && dataStore.currentUser() != nil
    }
    
    var currentUser: User {
        return dataStore.currentUser() ?? User(context: dataStore.mainContext)
    }

    var currentLocation: Location? {
        return dataStore.currentLocation()
    }

}
