//
//  RiderDataStore.swift
//  RiderApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class RiderDataStore: DataStore {

    convenience init() {
        self.init(name: "RiderApp")
    }
}
