//
//  ProgressHUD.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import Lottie

class ProgressHUD {

    private static var hudView: ProgressHUDView?

    static func show(on view: UIView? = nil) {
        guard hudView == nil else {
            // view already exists on screen
            return
        }

        hudView = ProgressHUDView()

        guard let window = UIApplication.shared.keyWindow,
            let existingHudView = hudView else {
                return
        }

        let baseView = view ?? window
        existingHudView.frame = baseView.bounds
        baseView.addSubview(existingHudView)

        existingHudView.startAnimating()

        UIView.animate(withDuration: 0.25) {
            // gradually apply the blur effect
            existingHudView.effect = UIBlurEffect(style: .regular)
        }
    }

    static func dismiss() {
        hudView?.stopAnimating()
        hudView?.removeFromSuperview()
        hudView = nil
    }
}

// The view that overlays the window
private class ProgressHUDView: UIVisualEffectView {

    override init(effect: UIVisualEffect?) {
        super.init(effect: nil)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private let progressView: LottieAnimationView = {
        let view = LottieAnimationView(name: "LoadingSeafoamAnimation")
        view.loopMode = .loop
        view.contentMode = .scaleAspectFit
        view.translatesAutoresizingMaskIntoConstraints = false
        view.constrainSize(CGSize(width: 600, height: 600))

        return view
    }()

    private lazy var progressContentView: UIView = {
        let view = UIView(backgroundColor: .white)
        view.constrainSize(CGSize(width: 200, height: 200))
        view.cornerRadius = 100
        view.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(progressView)
        progressView.setConstraints([.centerX, .centerY], toView: view)

        return view
    }()

    func startAnimating() {
        progressView.play()
    }

    func stopAnimating() {
        progressView.stop()
    }

    private func setup() {
        contentView.addSubview(progressContentView)
        progressContentView.setConstraints([.centerX, .centerY], toView: self)
    }
}
