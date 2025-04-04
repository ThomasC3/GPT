//
//  DriverSocket.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import SocketIO

protocol DriverSocketDelegate: SocketDelegate {
    func listenRideReceivedResponse(_ response: RideReceivedResponse)
    func listenRideUpdatesResponse(_ response: RideUpdatesResponse)
    func listenRideMessageReceived(_ response: RideMessageReceived)
    func listenRideCallRequested(_ response: RideCallRequested)
    func listenWSErrorResponse(_ response: WSErrorResponse)
}

class DriverSocket: Socket {

    weak var delegate: DriverSocketDelegate?

    init() {
        if let accessToken = KeychainManager.shared.getAccessToken() {
            super.init(connectParams: .connectParams(["token": accessToken]))
        } else {
            super.init(connectParams: nil)
        }
    }

    override func connect() {
        guard KeychainManager.shared.getAccessToken() != nil else {
            return disconnect()
        }

        super.connect()
    }

    override func addHandlers() {
        super.addHandlers()

        addListener(success: RideReceivedResponse.self, successCompletion: { response in
            self.handleSocketEventReceived()
            self.delegate?.listenRideReceivedResponse(response)
        })

        addListener(success: RideUpdatesResponse.self, successCompletion: { response in
            self.handleSocketEventReceived()
            self.delegate?.listenRideUpdatesResponse(response)
        })

        addListener(success: RideMessageReceived.self, successCompletion: { response in
            self.handleSocketEventReceived()
            self.delegate?.listenRideMessageReceived(response)
        })

        addListener(success: RideCallRequested.self, successCompletion: { response in
            self.handleSocketEventReceived()
            self.delegate?.listenRideCallRequested(response)
        })
        
        addListener(success: WSErrorResponse.self, successCompletion: { response in
            self.handleSocketEventReceived()
            self.delegate?.listenWSErrorResponse(response)
        })
    }
    
    override func handleSocketConnection() {
        self.delegate?.listenSocketConnected()
    }

    override func handleSocketDisconnection() {
        self.delegate?.listenSocketDisconnected()
    }

    override func handleSocketReconnection() {
        self.delegate?.listenSocketReconnecting()
    }

    override func handleSocketError() {
        self.delegate?.listenSocketError()
    }

    override func handleSocketEventReceived() {
        self.delegate?.listenSocketEventReceived()
    }

}
