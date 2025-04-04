//
//  ReportRideRequest.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/24/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct ReportRideRequest: Codable {

    let reason: String
    let feedback: String?
    let ride: String
}
