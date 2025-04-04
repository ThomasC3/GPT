//
//  DriverDataStore.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class DriverDataStore: DataStore {

    convenience init() {
        self.init(name: "DriverApp")
    }
}
