//
//  ImageLoader.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 10/01/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import UIKit
import OSLog

/// An utility for asynchronous image downloading and setting those images to a provided `UIImageView` instance.
class ImageLoader {

    private var task: URLSessionDataTask?

    func loadImage(from url: URL, into imageView: UIImageView) {
        // Cancel the previous task if it was running
        task?.cancel()

        task = URLSession.shared.dataTask(with: url) { [weak imageView] data, response, error in
            if let error = error {
                Logger.utilities.error("ImageLoader: downloading image failed with \(error.localizedDescription)")
                return
            }

            guard let data = data, let image = UIImage(data: data) else {
                Logger.utilities.error("ImageLoader: couldn't decode image from data")
                return
            }

            DispatchQueue.main.async {
                imageView?.image = image
            }
        }

        task?.resume()
    }

    func cancel() {
        task?.cancel()
        task = nil
    }

}
