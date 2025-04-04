//
//  URLRequest+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension URLRequest {

    init(url: URL, queryParameters: [String: Any]?) {
        var urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: false)

        if let queryParameters = queryParameters {
            var queryItems = [URLQueryItem]()

            for (key, value) in queryParameters {
                queryItems.append(URLQueryItem(name: key, value: "\(value)"))
            }

            urlComponents?.queryItems = queryItems
        }

        guard let requestUrl = urlComponents?.url else {
            fatalError("Failed to create URL from URLComponents")
        }

        self.init(url: requestUrl)
    }
}
