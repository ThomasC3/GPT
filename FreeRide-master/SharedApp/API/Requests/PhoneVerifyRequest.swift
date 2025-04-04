//
//  PhoneVerifyRequest.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct PhoneVerifyRequest: Codable {

    let phone: String
    let countryCode: String
    let code: String
}
