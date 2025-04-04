//
//  EmptyView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/20/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class EmptyView: UIView {

    @IBOutlet private weak var titleLabel: Label?
    @IBOutlet private weak var imageView: UIImageView?
    @IBOutlet private weak var emptyStackView: UIStackView?
    @IBOutlet private weak var loadingIndicator: UIActivityIndicatorView?
    @IBOutlet private weak var footerImageView: UIImageView?

    override func awakeFromNib() {
        super.awakeFromNib()
        titleLabel?.style = .title1bluegray
    }

    var title: String? {
        get { return titleLabel?.text }
        set { titleLabel?.text = newValue?.uppercased() }
    }

    var emptyImage: UIImage? {
        get { return imageView?.image }
        set { imageView?.image = newValue }
    }

    var footerImage: UIImage? {
        get { return footerImageView?.image }
        set { footerImageView?.image = newValue }
    }

    var footerHeight: CGFloat {
        guard isShowingFooter, footerImage != nil,
            let footerImageView = footerImageView else {
                return 0
        }

        return footerImageView.frame.height
    }

    var isLoading: Bool {
        get { return loadingIndicator?.isAnimating ?? false }
        set {
            newValue ? loadingIndicator?.startAnimating() : loadingIndicator?.stopAnimating()
            if newValue {
                isShowingEmpty = false
                isShowingFooter = false
            }
        }
    }

    var isShowingEmpty: Bool {
        get { return !(emptyStackView?.isHidden ?? true) }
        set { emptyStackView?.isHidden = !newValue }
    }

    var isShowingFooter: Bool {
        get { return !(footerImageView?.isHidden ?? true) }
        set { footerImageView?.isHidden = !newValue }
    }
}
