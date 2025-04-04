//
//  SplashViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import Lottie

class SplashViewController: ViewController {

    private let animatedView: LottieAnimationView = {
        let view = LottieAnimationView(name: "SplashAnimation")
        view.loopMode = .loop
        view.contentMode = .scaleAspectFit
        view.translatesAutoresizingMaskIntoConstraints = false

        return view
    }()

    override func viewDidLoad() {
        super.viewDidLoad()

        view.addSubview(animatedView)
        animatedView.pinEdges(to: view)
    }
}
