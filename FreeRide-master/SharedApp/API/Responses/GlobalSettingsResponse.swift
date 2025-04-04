//
//  GlobalSettingsResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct GlobalSettingsResponse: Codable {

    let skipPhoneVerification: Bool
    let isDynamicRideSearch: Bool
    let flux: Bool
    let hideTripAlternativeSurvey: Bool
}
