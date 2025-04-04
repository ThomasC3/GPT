//
//  Socket.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import SocketIO
import OSLog

protocol SocketDelegate: AnyObject {
    func listenSocketConnected()
    func listenSocketDisconnected()
    func listenSocketReconnecting()
    func listenSocketError()
    func listenSocketEventReceived()
}

class Socket {

    static let hostURL: URL = {
        if let urlString = Bundle.main.object(forInfoDictionaryKey: "Socket URL") as? String,
           let url = URL(string: urlString) {
            return url
        }

        fatalError("Info dictionary must specify a String for key \"Socket URL\".")
    }()

    static let userAgent: String = {
        // Example: DriverApp-Stage/14.2.0 (com.thefreeride.driver.stage; build:1; iOS 17.0.1) Socket.io
        let infoDictionary = Bundle.main.infoDictionary
        guard let appName = infoDictionary?["CFBundleName"] as? String else {
            fatalError("Unexpected: CFBundleName is missing")
        }
        guard let appVersion = infoDictionary?["CFBundleShortVersionString"] as? String else {
            fatalError("Unexpected: CFBundleShortVersionString is missing")
        }
        guard let bundleId = Bundle.main.bundleIdentifier else {
            fatalError("Unexpected: Bundle Identifier is missing")
        }
        guard let buildNumber = infoDictionary?["CFBundleVersion"] as? String else {
            fatalError("Unexpected: CFBundleVersion is missing")
        }
        let systemVersion = UIDevice.current.systemVersion
        return "\(appName)/\(appVersion) (\(bundleId); build:\(buildNumber); iOS \(systemVersion)) Socket.io"
    }()

    let manager: SocketManager
    let client: SocketIOClient

    private(set) var isSocketConnectingForFirstTime: Bool = true

    #if STAGING || DEVELOP
    static let runtimeLogger: RuntimeLogger? = RuntimeLogger(limit: 2000)
    #else
    static let runtimeLogger: RuntimeLogger? = nil
    #endif

    init(connectParams: SocketIOClientOption?) {
        var config: SocketIOClientConfiguration
        config = SocketIOClientConfiguration(
            arrayLiteral: 
                .forceWebsockets(true),
                .version(.three), 
                .forceNew(true),
                // Should not wait more than 5 seconds to try a reconnection:
                .reconnectWait(1),
                .reconnectWaitMax(5),
                // Disconnect if it's not able to reconnect after the X attempts:
                .reconnectAttempts(30)
        )

        config.insert(.extraHeaders(["User-Agent": Socket.userAgent]))

        if let connectParams = connectParams {
            config.insert(connectParams)
        }

        //config.insert(.log(true))

        manager = SocketManager(socketURL: Socket.hostURL, config: config)
        client = manager.defaultSocket

        addHandlers()
    }

    func connect() {
        let socketId: String = client.socketId
        Socket.runtimeLogger?.log(.debug, "Socket '\(socketId)' attempt to CONNECT has been called (status: \(client.status)")
        switch client.status {
        case .disconnected, .notConnected:
            Socket.runtimeLogger?.log(.debug, "Socket CONNECT has been called")
            client.connect()
        default:
            // Already connected or connecting
            break
        }
    }

    func disconnect() {
        let socketId: String = client.socketId
        Socket.runtimeLogger?.log(.debug, "Socket '\(socketId)' attempt to DISCONNECT has been called (status: \(client.status)")
        switch client.status {
        case .connected, .connecting:
            Socket.runtimeLogger?.log(.debug, "Socket DISCONNECT has been called")
            client.disconnect()
        default:
            // Already disconnected or notConnected
            break
        }
    }

    func addHandlers() {
        client.on(clientEvent: .connect) { [weak client = self.client, weak runtimeLogger = Self.runtimeLogger] (data, ack) in
            let socketId: String = client.socketId
            Logger.webSockets.info("Socket '\(socketId)' connected with payload: \(data)")
            runtimeLogger?.log(.info, "Socket '\(socketId)' connected with payload: \(data)")

            guard let accessToken = KeychainManager.shared.getAccessToken() else {
                return
            }

            Logger.webSockets.info("Socket '\(socketId)' starting authentication")
            runtimeLogger?.log(.info, "Socket '\(socketId)' starting authentication")
            let emitter = AuthenticateEmitter(token: accessToken)
            self.emit(emitter)

            self.handleSocketConnection()
            self.isSocketConnectingForFirstTime = false
        }

        client.on(clientEvent: .disconnect) { [weak client = self.client, weak runtimeLogger = Self.runtimeLogger] (data, ack) in
            let socketId: String = client.socketId
            Logger.webSockets.warning("Socket '\(socketId)' disconnected with payload: \(data)")
            runtimeLogger?.log(.warn, "Socket '\(socketId)' disconnected with payload: \(data)")
            self.handleSocketDisconnection()
        }

        client.on(clientEvent: .error) { [weak client = self.client, weak runtimeLogger = Self.runtimeLogger] (data, ack) in
            let socketId: String = client.socketId
            Logger.webSockets.error("Socket '\(socketId)' error with payload: \(data)")
            runtimeLogger?.log(.error, "Socket '\(socketId)' error with payload: \(data)")
            self.handleSocketError()
        }

        client.on(clientEvent: .reconnect) { [weak client = self.client, weak runtimeLogger = Self.runtimeLogger] (data, ack) in
            // Received when the client begins the reconnection process.
            let socketId: String = client.socketId
            Logger.webSockets.info("Socket '\(socketId)' reconnect with payload: \(data)")
            runtimeLogger?.log(.info, "Socket '\(socketId)' reconnect with payload: \(data)")
        }

        client.on(clientEvent: .reconnectAttempt) { [weak client = self.client, weak runtimeLogger = Self.runtimeLogger] (data, ack) in
            // Received each time the client tries to reconnect to the server.
            let socketId: String = client.socketId
            Logger.webSockets.info("Socket '\(socketId)' reconnect attempt with payload: \(data)")
            runtimeLogger?.log(.info, "Socket '\(socketId)' reconnect attempt with payload: \(data)")
            self.handleSocketReconnection()

            // Temporary Sanity check
            if let attemptsRemaining = data.first as? Int {
                if attemptsRemaining <= 1 {
                    // Check if device is reachable
                    URLSession.shared.dataTask(with: Constants.hostURL) { (data, response, error) in
                        if let _ = error {
                            // Server is not reachable.
                        }
                        else if let _ = response as? HTTPURLResponse {
                            // Server is reachable!
                            let issueMessage = "Socket is trying to connect but server is REACHABLE"
                            runtimeLogger?.log(.error, issueMessage)
                            BugsnagManager.notifyError("SOCKET_REACHABILITY", reason: issueMessage)
                        }
                    }.resume()
                }
            }
        }

        client.on(clientEvent: .statusChange) { [weak client = self.client, weak runtimeLogger = Self.runtimeLogger] (data, ack) in
            // Received every time there is a change in the client's status.
            let socketId: String = client.socketId
            Logger.webSockets.info("Socket '\(socketId)' status change with payload: \(data)")
            runtimeLogger?.log(.info, "Socket '\(socketId)' status change with payload: \(data)")
        }

        client.on(clientEvent: .pong) { _, _ in
            // Any event we receive is an indication that the connection is working.
            // Let's update the connectivity state.
            self.handleSocketEventReceived()
        }
    }

    func emit<T: Emitter>(_ emitter: T) {
        let socketId: String = client.socketId
        switch client.status {
        case .connected:
            let payload = emitter.toJSONDictionary()
            Logger.webSockets.info("⤴️ Socket '\(socketId)' sending `\(T.emitter)` with payload: \(payload)")
            Self.runtimeLogger?.log(.info, "⤴️ Socket '\(socketId)' sending `\(T.emitter)` with payload: \(payload)")
            client.emit(
                T.emitter,
                with: [payload],
                completion: nil
            )
        default:
            break
        }
    }

    func addListener<Success: Listener>(success: Success.Type, successCompletion: @escaping ((Success) -> Void), failureCompletion: ((SocketErrorResponse) -> Void)? = nil) {
        let listenerName = success.listener
        Logger.webSockets.debug("Socket '\(self.client.socketId)' registering listener `\(listenerName)`")
        Self.runtimeLogger?.log(.debug, "Socket '\(self.client.socketId)' registering listener `\(listenerName)`")

        client.on(listenerName) { [weak client = self.client, weak runtimeLogger = Self.runtimeLogger] (data, ack) in
            let socketId: String = client.socketId
            Logger.webSockets.debug("Socket '\(socketId)' receiving `\(listenerName)` with data \(data)")
            runtimeLogger?.log(.debug, "Socket '\(socketId)' receiving `\(listenerName)` with data \(data)")

            self.decode(data: data, as: success.self, completion: { (decodedData, error) in
                if let successPayload = decodedData {
                    Logger.webSockets.info("⤵️ Socket '\(socketId)' received `\(listenerName)` with payload: \(String(describing: successPayload))")
                    runtimeLogger?.log(.info, "⤵️ Socket '\(socketId)' received `\(listenerName)` with payload: \(String(describing: successPayload))")
                    successCompletion(successPayload)
                }
                else {
                    if let error = error {
                        Logger.webSockets.critical("Decoding `\(listenerName)` payload with type `\(success)` failed with '\(error.localizedDescription)'")
                        runtimeLogger?.log(.error, "Decoding `\(listenerName)` payload with type `\(success)` failed with '\(error.localizedDescription)'")
                    }
                    else {
                        Logger.webSockets.critical("Decoding `\(listenerName)` payload with type `\(success)` failed with unknown error")
                        runtimeLogger?.log(.error, "Decoding `\(listenerName)` payload with type `\(success)` failed with unknown error")
                    }

                    guard failureCompletion != nil else {
                        return
                    }

                    // Check if there's information of the failure
                    self.decode(data: data, as: SocketErrorResponse.self, completion: { (decodedData, error) in
                        guard let errorPayload = decodedData else {
                            return
                        }
                        Logger.webSockets.info("⤵️ Socket '\(socketId)' received `\(listenerName)` with error: \(String(describing: errorPayload))")
                        runtimeLogger?.log(.info, "⤵️ Socket '\(socketId)' received `\(listenerName)` with error: \(String(describing: errorPayload))")
                        failureCompletion?(errorPayload)
                    })
                }
            })
        }
    }

    func decode<T: Listener>(data: [Any], as type: T.Type, completion: @escaping (T?, Error?) -> Void) {
        guard let json = data.first,
            let dataData = try? JSONSerialization.data(withJSONObject: json, options: .prettyPrinted) else {
                return
        }

        let decoder = RiderAppJSONDecoder()

        do {
            let result = try decoder.decode(T.self, from: dataData)
            completion(result, nil)
        } catch {
            completion(nil, error)
        }
    }

    func handleSocketConnection() {
        // Function to be overridden
    }

    func handleSocketDisconnection() {
        // Function to be overridden
    }
    
    func handleSocketReconnection() {
        // Function to be overridden
    }

    func handleSocketError() {
        // Function to be overridden
    }

    func handleSocketEventReceived() {
        // Function to be overridden
    }

}

extension SocketIOClient {

    var socketId: String {
        return sid ?? "no_id"
    }

}

extension Optional where Wrapped: SocketIOClient {

    var socketId: String {
        switch self {
        case .none: "no_id"
        case .some(let value): value.socketId
        }
    }

}
