//
//  ContentViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/9/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class ContentViewController: ViewController {

    struct Content {

        let image: UIImage
        let title: String?
        let subtitle: String?
    }

    @IBOutlet private weak var imageView: UIImageView?
    @IBOutlet private weak var titleLabel: Label?
    @IBOutlet private weak var subtitleLabel: Label?

    private var content: Content?
    private(set) var index: Int?

    var contentMode: UIView.ContentMode = .scaleAspectFill

    override func viewDidLoad() {
        super.viewDidLoad()

        imageView?.translatesAutoresizingMaskIntoConstraints = false
        imageView?.image = content?.image
        imageView?.contentMode = contentMode

        titleLabel?.text = content?.title
        subtitleLabel?.text = content?.subtitle
    }

    override func applyTheme() {
        super.applyTheme()

        titleLabel?.style = .title4white
        subtitleLabel?.style = .subtitle5white
    }

    func configure(index: Int?, content: Content) {
        self.index = index
        self.content = content
    }
}
