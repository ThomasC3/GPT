//
//  WSErrorResponse.swift
//  FreeRide
//
//  Created by Rui Magalhães on 21/01/2020.
//  Copyright © 2020 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct WSErrorResponse: Listener {

    static var listener: String = "wserror"

    let message: String
    
    func messageOnBlackList() -> Bool {
        let errorBlacklist = [
            "remoteJoin",
            "allRooms"
        ]
        
        for error in errorBlacklist {
            if message.contains(error) {
                return true
            }
        }
        
        return false
    }
    
}
