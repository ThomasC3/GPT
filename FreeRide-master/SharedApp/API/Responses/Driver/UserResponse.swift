//
//  UserResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct UserResponse: Codable {

    let id: String
    let firstName: String
    let lastName: String
    let displayName: String
    let email: String
    let location: [String]
    let activeLocation: String?
}
