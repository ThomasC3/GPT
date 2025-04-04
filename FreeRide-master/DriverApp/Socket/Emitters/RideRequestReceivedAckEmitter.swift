//
//  RideRequestReceivedAck.swift
//  FreeRide
//

import Foundation

struct RideRequestReceivedAckEmitter: Emitter {

    static let emitter = "ride-request-received-ack"

    let ride: String
}
