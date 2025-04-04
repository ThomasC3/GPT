//
//  Logger.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 16/10/2023.
//  Copyright © 2023 Circuit. All rights reserved.
//

import OSLog

@available(iOS 14.0, *)
extension Logger {
    private static var subsystem = Bundle.main.bundleIdentifier!

    // System
    static let webSockets = Logger(subsystem: subsystem, category: "WebSockets")
    static let analytics = Logger(subsystem: subsystem, category: "Analytics")
    static let api = Logger(subsystem: subsystem, category: "API")
    static let apiVerbose = Logger(subsystem: subsystem, category: "APIVerbose") //with sensible info
    static let database = Logger(subsystem: subsystem, category: "Database")
    static let utilities = Logger(subsystem: subsystem, category: "Utilities")
    // Features
    static let rideRequest = Logger(subsystem: subsystem, category: "RideRequest")

}

/// `RuntimeLogger` is an in-memory logging class that stores a set list of log entries with different log levels. It is designed to
/// keep a record of recent logs up to a specified limit, making the logs accessible for debugging purposes or runtime inspection.
internal class RuntimeLogger {

    enum LogLevel: String {
        case verbose = "VERBOSE"
        case debug = "DEBUG"
        case info = "INFO"
        case warn = "WARN"
        case error = "ERROR"
    }

    private var logs: [String]
    /// DateFormatter to format the timestamp for each log entry.
    private let dateFormatter: DateFormatter
    /// Maximum number of log entries to store in memory.
    private let maxNumberOfEntries: Int

    init(limit: Int) {
        self.logs = [String]()
        self.maxNumberOfEntries = limit
        self.dateFormatter = DateFormatter()
        self.dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss z"
    }

    func log(_ message: String) {
        log(.debug, message)
    }

    func log(_ level: LogLevel, _ message: String) {
        if logs.count == maxNumberOfEntries {
            logs.removeLast()
        }
        let timestamp = dateFormatter.string(from: Date())
        logs.insert("\(timestamp) [\(level.rawValue)] \(message)", at: 0)
    }

    func getLogs() -> [String] {
        return logs
    }

}

#if DEBUG
func debug_RocketSimNetworkObserver() {
    guard (Bundle(path: "/Applications/RocketSim.app/Contents/Frameworks/RocketSimConnectLinker.nocache.framework")?.load() == true) else {
        return
    }
    print("DEBUG: RocketSim Network Observer successfully linked")
}
#endif
