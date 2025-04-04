//
//  LoginResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct LoginResponse: Codable {

    let id: String
    let firstName: String
    let lastName: String
    let email: String
    let zip: String
    let gender: String?
    let dob: String
    let phone: String?
    let isPhoneVerified: Bool
    let google: String?
    let apple: String?
    let accessToken: String
    let iosUserIntercomHash: String?
}
