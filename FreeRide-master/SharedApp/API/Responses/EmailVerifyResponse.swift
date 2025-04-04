//
//  EmailVerifyResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct EmailVerifyResponse: Codable {

    let email: String
    let code: String
    let accessToken: String
}
