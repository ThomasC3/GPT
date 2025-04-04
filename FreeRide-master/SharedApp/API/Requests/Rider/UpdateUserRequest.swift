//
//  UpdateUserRequest.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct UpdateUserRequest: Codable {

    let firstName: String?
    let lastName: String?
    let zip: String?
    let gender: String?
    let dob: String?
}


struct UpdateLocaleRequest: Codable {

    let locale: String
}
