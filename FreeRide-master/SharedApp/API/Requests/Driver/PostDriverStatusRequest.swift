//
//  PostDriverStatusRequest.swift
//  FreeRide
//


import Foundation

struct PostDriverStatusRequest: Codable {

    let isAvailable: Bool
    let reason: String??
}
